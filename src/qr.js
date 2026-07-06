// src/qr.js — Minimal QR Code generator (Mode 4 / Byte, ECC-L, versions 1-10)
// Renders to a <canvas> and returns a data-URL PNG.

// ── Galois Field GF(256) tables ──────────────
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
  let v = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = v;
    LOG[v] = i;
    v = (v << 1) ^ (v & 128 ? 0x11d : 0);
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

function gfMul(a, b) {
  return a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]];
}

// ── Reed-Solomon error correction ────────────
function rsGenPoly(n) {
  let g = [1];
  for (let i = 0; i < n; i++) {
    const next = new Array(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j++) {
      next[j] ^= g[j];
      next[j + 1] ^= gfMul(g[j], EXP[i]);
    }
    g = next;
  }
  return g;
}

function rsEncode(data, ecLen) {
  const gen = rsGenPoly(ecLen);
  const msg = new Array(data.length + ecLen).fill(0);
  for (let i = 0; i < data.length; i++) msg[i] = data[i];
  for (let i = 0; i < data.length; i++) {
    const coeff = msg[i];
    if (coeff !== 0) {
      for (let j = 0; j < gen.length; j++) {
        msg[i + j] ^= gfMul(gen[j], coeff);
      }
    }
  }
  return msg.slice(data.length);
}

// ── Version / capacity tables (ECC level L, byte mode) ──
// [totalCodewords, ecCodewordsPerBlock, numBlocks, dataCapacityBytes]
const VERSION_TABLE = [
  null, // v0 placeholder
  [26, 7, 1, 17],    // v1
  [44, 10, 1, 32],   // v2
  [70, 15, 1, 53],   // v3
  [100, 20, 1, 78],  // v4
  [134, 26, 1, 106], // v5
  [172, 18, 2, 134], // v6
  [196, 20, 2, 154], // v7
  [242, 24, 2, 192], // v8
  [292, 30, 2, 230], // v9
  [346, 18, 4, 271], // v10
];

function pickVersion(byteLen) {
  for (let v = 1; v <= 10; v++) {
    if (byteLen <= VERSION_TABLE[v][3]) return v;
  }
  throw new Error('Data too long for QR versions 1-10');
}

// ── Alignment pattern positions ──────────────
const ALIGN_POS = [
  null, [], [], [], [], [],
  [6, 34],   // v6
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
];

// ── Matrix operations ────────────────────────
function createMatrix(size) {
  return Array.from({ length: size }, () => new Int8Array(size)); // 0=unset, 1=black, -1=white
}

function setModule(matrix, r, c, dark) {
  if (r >= 0 && r < matrix.length && c >= 0 && c < matrix.length) {
    matrix[r][c] = dark ? 1 : -1;
  }
}

function placeFinderPattern(matrix, row, col) {
  for (let dr = -1; dr <= 7; dr++) {
    for (let dc = -1; dc <= 7; dc++) {
      const r = row + dr, c = col + dc;
      if (r < 0 || r >= matrix.length || c < 0 || c >= matrix.length) continue;
      const dark =
        (dr === 0 || dr === 6) && dc >= 0 && dc <= 6 ||
        (dc === 0 || dc === 6) && dr >= 0 && dr <= 6 ||
        dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
      setModule(matrix, r, c, dark);
    }
  }
}

function placeAlignmentPattern(matrix, row, col) {
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      const dark = Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0);
      setModule(matrix, row + dr, col + dc, dark);
    }
  }
}

function placeTimingPatterns(matrix) {
  const n = matrix.length;
  for (let i = 8; i < n - 8; i++) {
    const dark = i % 2 === 0;
    if (matrix[6][i] === 0) setModule(matrix, 6, i, dark);
    if (matrix[i][6] === 0) setModule(matrix, i, 6, dark);
  }
}

function reserveFormatArea(matrix) {
  const n = matrix.length;
  // Around top-left finder
  for (let i = 0; i <= 8; i++) {
    if (matrix[8][i] === 0) setModule(matrix, 8, i, false);
    if (matrix[i][8] === 0) setModule(matrix, i, 8, false);
  }
  // Around top-right finder
  for (let i = 0; i <= 7; i++) {
    if (matrix[8][n - 1 - i] === 0) setModule(matrix, 8, n - 1 - i, false);
  }
  // Around bottom-left finder
  for (let i = 0; i <= 7; i++) {
    if (matrix[n - 1 - i][8] === 0) setModule(matrix, n - 1 - i, 8, false);
  }
  // Dark module
  setModule(matrix, n - 8, 8, true);
}

function buildFunctionPattern(version) {
  const size = version * 4 + 17;
  const matrix = createMatrix(size);

  placeFinderPattern(matrix, 0, 0);
  placeFinderPattern(matrix, 0, size - 7);
  placeFinderPattern(matrix, size - 7, 0);
  placeTimingPatterns(matrix);

  if (version >= 2) {
    const positions = ALIGN_POS[version] || [];
    for (const r of positions) {
      for (const c of positions) {
        if (matrix[r][c] !== 0) continue; // skip if overlaps finder
        placeAlignmentPattern(matrix, r, c);
      }
    }
  }

  reserveFormatArea(matrix);
  return matrix;
}

// ── Data encoding (byte mode, ECC-L) ─────────
function encodeData(text, version) {
  const vt = VERSION_TABLE[version];
  const totalCodewords = vt[0];
  const ecPerBlock = vt[1];
  const numBlocks = vt[2];

  const bytes = new TextEncoder().encode(text);
  const dataCapacity = totalCodewords - ecPerBlock * numBlocks;

  // Build data stream: mode(4bits) + count(8 or 16 bits) + data + terminator + padding
  const bits = [];
  const pushBits = (val, len) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
  };

  pushBits(0b0100, 4); // byte mode
  pushBits(bytes.length, version >= 10 ? 16 : 8); // char count
  for (const b of bytes) pushBits(b, 8);

  // Terminator
  const totalDataBits = dataCapacity * 8;
  const terminatorLen = Math.min(4, totalDataBits - bits.length);
  pushBits(0, terminatorLen);

  // Pad to byte boundary
  while (bits.length % 8 !== 0) bits.push(0);

  // Pad bytes
  const padBytes = [0xEC, 0x11];
  let padIdx = 0;
  while (bits.length < totalDataBits) {
    pushBits(padBytes[padIdx % 2], 8);
    padIdx++;
  }

  // Convert to byte array
  const dataBytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | (bits[i + j] || 0);
    dataBytes.push(b);
  }

  // Split into blocks and compute EC
  const blockDataLen = Math.floor(dataCapacity / numBlocks);
  const blocks = [];
  const ecBlocks = [];
  let offset = 0;
  for (let i = 0; i < numBlocks; i++) {
    const extra = i < (dataCapacity % numBlocks) ? 0 : 0; // all same size for versions 1-10 L
    const len = blockDataLen + (i >= numBlocks - (dataCapacity % numBlocks) && dataCapacity % numBlocks !== 0 ? 1 : 0);
    const block = dataBytes.slice(offset, offset + len);
    blocks.push(block);
    ecBlocks.push(rsEncode(block, ecPerBlock));
    offset += len;
  }

  // Interleave data blocks
  const maxDataLen = Math.max(...blocks.map(b => b.length));
  const result = [];
  for (let i = 0; i < maxDataLen; i++) {
    for (const block of blocks) {
      if (i < block.length) result.push(block[i]);
    }
  }
  // Interleave EC blocks
  for (let i = 0; i < ecPerBlock; i++) {
    for (const ec of ecBlocks) {
      if (i < ec.length) result.push(ec[i]);
    }
  }

  return result;
}

// ── Place data bits on matrix ────────────────
function placeDataBits(matrix, codewords) {
  const n = matrix.length;
  const bits = [];
  for (const cw of codewords) {
    for (let i = 7; i >= 0; i--) bits.push((cw >> i) & 1);
  }

  let bitIdx = 0;
  let upward = true;

  for (let col = n - 1; col >= 1; col -= 2) {
    if (col === 6) col = 5; // skip timing column

    const rows = upward
      ? Array.from({ length: n }, (_, i) => n - 1 - i)
      : Array.from({ length: n }, (_, i) => i);

    for (const row of rows) {
      for (const dc of [0, -1]) {
        const c = col + dc;
        if (c < 0 || c >= n) continue;
        if (matrix[row][c] !== 0) continue; // already used by function pattern
        if (bitIdx < bits.length) {
          matrix[row][c] = bits[bitIdx] ? 1 : -1;
        } else {
          matrix[row][c] = -1;
        }
        bitIdx++;
      }
    }
    upward = !upward;
  }
}

// ── Masking ──────────────────────────────────
const MASK_FNS = [
  (r, c) => (r + c) % 2 === 0,
  (r, c) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => (r * c) % 2 + (r * c) % 3 === 0,
  (r, c) => ((r * c) % 2 + (r * c) % 3) % 2 === 0,
  (r, c) => ((r + c) % 2 + (r * c) % 3) % 2 === 0,
];

function applyMask(matrix, funcMatrix, maskIdx) {
  const n = matrix.length;
  const fn = MASK_FNS[maskIdx];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (funcMatrix[r][c] !== 0) continue; // don't mask function patterns
      if (fn(r, c)) {
        matrix[r][c] = matrix[r][c] === 1 ? -1 : 1;
      }
    }
  }
}

// ── Format info ──────────────────────────────
// ECC level L = 01, mask patterns 0-7
const FORMAT_BITS = [
  0x77C4, 0x72F3, 0x7DAA, 0x789D, 0x662F, 0x6318, 0x6C41, 0x6976,
];

function placeFormatInfo(matrix, maskIdx) {
  const n = matrix.length;
  const fmt = FORMAT_BITS[maskIdx];
  const bits = [];
  for (let i = 14; i >= 0; i--) bits.push((fmt >> i) & 1);

  // Horizontal: row 8
  const hPos = [0, 1, 2, 3, 4, 5, 7, 8, n - 7, n - 6, n - 5, n - 4, n - 3, n - 2, n - 1];
  for (let i = 0; i < 15; i++) {
    matrix[8][hPos[i]] = bits[i] ? 1 : -1;
  }

  // Vertical: col 8
  const vPos = [n - 1, n - 2, n - 3, n - 4, n - 5, n - 6, n - 7, 8, 7, 5, 4, 3, 2, 1, 0];
  for (let i = 0; i < 15; i++) {
    matrix[vPos[i]][8] = bits[i] ? 1 : -1;
  }
}

// ── Penalty scoring ──────────────────────────
function penaltyScore(matrix) {
  const n = matrix.length;
  let score = 0;

  // Rule 1: runs of 5+ same color
  for (let r = 0; r < n; r++) {
    let run = 1;
    for (let c = 1; c < n; c++) {
      if ((matrix[r][c] > 0) === (matrix[r][c - 1] > 0)) {
        run++;
        if (run === 5) score += 3;
        else if (run > 5) score += 1;
      } else {
        run = 1;
      }
    }
  }
  for (let c = 0; c < n; c++) {
    let run = 1;
    for (let r = 1; r < n; r++) {
      if ((matrix[r][c] > 0) === (matrix[r - 1][c] > 0)) {
        run++;
        if (run === 5) score += 3;
        else if (run > 5) score += 1;
      } else {
        run = 1;
      }
    }
  }

  // Rule 4: proportion of dark modules
  let darkCount = 0;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r][c] > 0) darkCount++;
    }
  }
  const pct = (darkCount * 100) / (n * n);
  const prev5 = Math.floor(pct / 5) * 5;
  const next5 = prev5 + 5;
  score += Math.min(Math.abs(prev5 - 50) / 5, Math.abs(next5 - 50) / 5) * 10;

  return score;
}

// ── Main generation ──────────────────────────
function generateQrMatrix(text) {
  const bytes = new TextEncoder().encode(text);
  const version = pickVersion(bytes.length);
  const codewords = encodeData(text, version);

  // Build function pattern reference (to know which modules not to mask)
  const funcMatrix = buildFunctionPattern(version);

  // Try all 8 masks, pick lowest penalty
  let bestMatrix = null;
  let bestScore = Infinity;

  for (let m = 0; m < 8; m++) {
    const mat = buildFunctionPattern(version);
    placeDataBits(mat, codewords);
    applyMask(mat, funcMatrix, m);
    placeFormatInfo(mat, m);

    const sc = penaltyScore(mat);
    if (sc < bestScore) {
      bestScore = sc;
      bestMatrix = mat;
    }
  }

  return bestMatrix;
}

// ── Render to canvas data URL ────────────────
export function generateQrDataUrl(text, pixelSize = 260) {
  const matrix = generateQrMatrix(text);
  const n = matrix.length;
  const scale = Math.max(1, Math.floor(pixelSize / (n + 8))); // 4-module quiet zone
  const totalSize = (n + 8) * scale;

  const canvas = document.createElement('canvas');
  canvas.width = totalSize;
  canvas.height = totalSize;
  const ctx = canvas.getContext('2d');

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, totalSize, totalSize);

  // Draw dark modules
  ctx.fillStyle = '#000000';
  const offset = 4 * scale; // quiet zone
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r][c] > 0) {
        ctx.fillRect(offset + c * scale, offset + r * scale, scale, scale);
      }
    }
  }

  return canvas.toDataURL('image/png');
}
