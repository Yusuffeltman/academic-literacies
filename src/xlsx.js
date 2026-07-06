// src/xlsx.js — Minimal native XLSX generator (no dependencies)
// Builds an Open XML spreadsheet from row/column data and triggers download.

// ── ZIP helpers (minimal deflate-free ZIP — stores only) ──

function _crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function _dosDateTime(date) {
  const d = date || new Date();
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >>> 1);
  const day = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date: day };
}

function _buildZip(files) {
  const enc = new TextEncoder();
  const parts = [];
  const centralDir = [];
  let offset = 0;

  for (const { name, content } of files) {
    const nameBytes = enc.encode(name);
    const data = typeof content === 'string' ? enc.encode(content) : content;
    const crc = _crc32(data);
    const dt = _dosDateTime();

    // Local file header
    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034B50, true);   // signature
    lv.setUint16(4, 20, true);            // version needed
    lv.setUint16(6, 0, true);             // flags
    lv.setUint16(8, 0, true);             // compression: store
    lv.setUint16(10, dt.time, true);
    lv.setUint16(12, dt.date, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);  // compressed
    lv.setUint32(22, data.length, true);  // uncompressed
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);            // extra field len
    local.set(nameBytes, 30);

    // Central directory entry
    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014B50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, dt.time, true);
    cv.setUint16(14, dt.date, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0x20, true);         // external attrs
    cv.setUint32(42, offset, true);       // offset to local
    central.set(nameBytes, 46);

    parts.push(local, data);
    centralDir.push(central);
    offset += local.length + data.length;
  }

  const centralStart = offset;
  let centralSize = 0;
  for (const c of centralDir) centralSize += c.length;

  // End of central directory
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054B50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, centralStart, true);
  ev.setUint16(20, 0, true);

  const blob = new Blob([...parts, ...centralDir, eocd], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  return blob;
}

// ── XML escaping ──

function _x(val) {
  return String(val == null ? '' : val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Column letter (0-based index → A, B, ..., Z, AA, AB, ...) ──

function _colLetter(idx) {
  let s = '';
  let n = idx;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

// ── Build XLSX from sheets ──

/**
 * @param {Array<{name: string, headers: string[], rows: Array<Array<string|number>>}>} sheets
 * @param {string} filename
 */
export function downloadXlsx(sheets, filename) {
  // Shared strings table
  const sharedStrings = [];
  const ssIndex = new Map();
  function ssRef(val) {
    const s = String(val == null ? '' : val);
    if (ssIndex.has(s)) return ssIndex.get(s);
    const idx = sharedStrings.length;
    sharedStrings.push(s);
    ssIndex.set(s, idx);
    return idx;
  }

  // Pre-index all strings
  for (const sheet of sheets) {
    for (const h of sheet.headers) ssRef(h);
    for (const row of sheet.rows) {
      for (const cell of row) {
        if (typeof cell !== 'number') ssRef(cell);
      }
    }
  }

  // Build shared strings XML
  const ssXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${sharedStrings.length}" uniqueCount="${sharedStrings.length}">
${sharedStrings.map(s => `<si><t>${_x(s)}</t></si>`).join('\n')}
</sst>`;

  // Build sheet XMLs
  const sheetXmls = sheets.map((sheet) => {
    const allRows = [sheet.headers, ...sheet.rows];
    const lastCol = _colLetter(Math.max(0, (sheet.headers.length || 1) - 1));
    const lastRow = allRows.length;

    let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetData>`;

    allRows.forEach((row, ri) => {
      xml += `<row r="${ri + 1}">`;
      row.forEach((cell, ci) => {
        const ref = `${_colLetter(ci)}${ri + 1}`;
        if (typeof cell === 'number' && Number.isFinite(cell)) {
          xml += `<c r="${ref}"><v>${cell}</v></c>`;
        } else {
          xml += `<c r="${ref}" t="s"><v>${ssRef(cell)}</v></c>`;
        }
      });
      xml += '</row>';
    });

    xml += '</sheetData>';

    // Auto-filter on header row
    if (sheet.headers.length) {
      xml += `<autoFilter ref="A1:${lastCol}${lastRow}"/>`;
    }

    xml += '</worksheet>';
    return xml;
  });

  // Styles (minimal — bold header row)
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2">
  <font><sz val="11"/><name val="Calibri"/></font>
  <font><b/><sz val="11"/><name val="Calibri"/></font>
</fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="2">
  <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
  <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
</cellXfs>
</styleSheet>`;

  // Content types
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('\n')}
</Types>`;

  // Relationships
  const relsRoot = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const relsWb = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('\n')}
<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
<Relationship Id="rId${sheets.length + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`;

  // Workbook
  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>
${sheets.map((s, i) => `<sheet name="${_x(s.name.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('\n')}
</sheets>
</workbook>`;

  // Build ZIP
  const files = [
    { name: '[Content_Types].xml', content: contentTypes },
    { name: '_rels/.rels', content: relsRoot },
    { name: 'xl/_rels/workbook.xml.rels', content: relsWb },
    { name: 'xl/workbook.xml', content: workbookXml },
    { name: 'xl/styles.xml', content: stylesXml },
    { name: 'xl/sharedStrings.xml', content: ssXml },
    ...sheetXmls.map((xml, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, content: xml })),
  ];

  const blob = _buildZip(files);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
