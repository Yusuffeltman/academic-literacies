import mammoth from 'mammoth/mammoth.browser.js';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import JSZip from 'jszip';
import {
  DEFAULT_MAX_CHARS_PER_FILE,
  DEFAULT_PDF_OCR_PAGE_LIMIT,
  MIN_PDF_TEXT_LAYER_CHARS,
  OCR_IMAGE_EXTENSIONS,
  getSubmissionFileExtension,
  normalizeSubmissionText,
  truncateSubmissionText,
} from './document-text-shared.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

let _ocrWorkerPromise = null;

async function _fetchArrayBuffer(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.arrayBuffer();
}

async function _fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

async function _fetchBlob(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.blob();
}

async function _getOcrWorker() {
  if (!_ocrWorkerPromise) {
    _ocrWorkerPromise = (async () => {
      const { createWorker } = await import('tesseract.js');
      return createWorker('eng');
    })();
  }
  return _ocrWorkerPromise;
}

async function _ocrFromSource(source, { maxChars = DEFAULT_MAX_CHARS_PER_FILE } = {}) {
  const worker = await _getOcrWorker();
  const result = await worker.recognize(source);
  return truncateSubmissionText(result?.data?.text || '', maxChars);
}

async function _renderPdfPageToCanvas(page, scale = 1.5) {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  await page.render({ canvasContext: context, viewport }).promise;
  return canvas;
}

async function _extractPdfText(
  arrayBuffer,
  {
    maxChars = DEFAULT_MAX_CHARS_PER_FILE,
    pageLimit = 8,
    ocrPageLimit = DEFAULT_PDF_OCR_PAGE_LIMIT,
  } = {},
) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageCount = Math.min(pdf.numPages || 0, pageLimit);
  const parts = [];
  let usedOcr = false;

  for (let pageNo = 1; pageNo <= pageCount; pageNo += 1) {
    const page = await pdf.getPage(pageNo);
    const textContent = await page.getTextContent();
    const pageText = [];
    (Array.isArray(textContent?.items) ? textContent.items : []).forEach((item) => {
      if (!item || typeof item.str !== 'string') return;
      pageText.push(item.str);
      if (item.hasEOL) pageText.push('\n');
    });
    let normalized = normalizeSubmissionText(pageText.join(' '), maxChars);
    if ((!normalized || normalized.length < MIN_PDF_TEXT_LAYER_CHARS) && pageNo <= ocrPageLimit) {
      const canvas = await _renderPdfPageToCanvas(page);
      const ocrText = await _ocrFromSource(canvas, { maxChars });
      if (ocrText) {
        normalized = ocrText;
        usedOcr = true;
      }
    }
    if (normalized) parts.push(normalized);
    if (normalizeSubmissionText(parts.join('\n\n'), maxChars).length >= maxChars) break;
  }

  return {
    text: truncateSubmissionText(parts.join('\n\n'), maxChars),
    usedOcr,
  };
}

async function _extractDocxText(arrayBuffer, { maxChars = DEFAULT_MAX_CHARS_PER_FILE } = {}) {
  const result = await mammoth.extractRawText({ arrayBuffer });
  return truncateSubmissionText(result?.value || '', maxChars);
}

async function _renderDocxHtml(arrayBuffer = null) {
  if (!arrayBuffer) return '';
  const result = await mammoth.convertToHtml({ arrayBuffer });
  return String(result?.value || '').trim();
}

function _decodeXmlEntities(value = '') {
  try {
    const doc = new DOMParser().parseFromString(`<root>${value}</root>`, 'application/xml');
    return doc?.documentElement?.textContent || '';
  } catch {
    return String(value || '');
  }
}

function _extractDocxXmlPlainText(xml = '') {
  if (!xml) return '';
  const withBreaks = String(xml)
    .replace(/<w:tab[^>]*\/>/gi, '\t')
    .replace(/<w:br[^>]*\/>/gi, '\n')
    .replace(/<\/w:p>/gi, '\n\n');
  const stripped = withBreaks.replace(/<[^>]+>/g, '');
  return _decodeXmlEntities(stripped);
}

async function _extractDocxTextFallback(arrayBuffer, { maxChars = DEFAULT_MAX_CHARS_PER_FILE } = {}) {
  const zip = await JSZip.loadAsync(arrayBuffer);
  const candidateNames = Object.keys(zip.files || {})
    .filter((name) => /^word\/(document|footnotes|endnotes|comments|header\d+|footer\d+)\.xml$/i.test(name));

  const parts = [];
  for (const name of candidateNames) {
    const xml = await zip.file(name)?.async('string');
    const text = truncateSubmissionText(_extractDocxXmlPlainText(xml || ''), maxChars);
    if (text) parts.push(text);
    if (normalizeSubmissionText(parts.join('\n\n'), maxChars).length >= maxChars) break;
  }

  return truncateSubmissionText(parts.join('\n\n'), maxChars);
}

export async function extractSubmissionFileTextImpl(
  file = {},
  { maxChars = DEFAULT_MAX_CHARS_PER_FILE, pageLimit = 8 } = {},
) {
  const ext = getSubmissionFileExtension(file.name);
  const base = {
    name: String(file.name || 'file'),
    ext,
    url: String(file.url || ''),
    status: 'unsupported',
    text: '',
    note: '',
    source: '',
  };

  if (!base.url) return { ...base, note: 'Missing file URL.' };

  try {
    if (ext === 'txt') {
      const text = await _fetchText(base.url);
      return { ...base, status: 'ok', text: truncateSubmissionText(text, maxChars), source: 'native' };
    }
    if (ext === 'pdf') {
      const buffer = await _fetchArrayBuffer(base.url);
      const extracted = await _extractPdfText(buffer, { maxChars, pageLimit });
      return {
        ...base,
        status: extracted.text ? 'ok' : 'empty',
        text: extracted.text,
        note: extracted.text
          ? (extracted.usedOcr ? 'OCR used for one or more PDF pages.' : '')
          : 'No extractable PDF text found.',
        source: extracted.usedOcr ? 'ocr' : 'native',
      };
    }
    if (ext === 'docx') {
      const buffer = await _fetchArrayBuffer(base.url);
      let text = '';
      let source = 'native';
      try {
        text = await _extractDocxText(buffer, { maxChars });
      } catch {
        text = '';
      }
      if (!text) {
        text = await _extractDocxTextFallback(buffer, { maxChars });
        if (text) source = 'native-fallback';
      }
      return {
        ...base,
        status: text ? 'ok' : 'empty',
        text,
        note: text ? (source === 'native-fallback' ? 'DOCX fallback extraction was used.' : '') : 'No extractable DOCX text found.',
        source,
      };
    }
    if (OCR_IMAGE_EXTENSIONS.has(ext)) {
      const blob = await _fetchBlob(base.url);
      const text = await _ocrFromSource(blob, { maxChars });
      return {
        ...base,
        status: text ? 'ok' : 'empty',
        text,
        note: text ? 'OCR extracted image text.' : 'No readable text found in the image.',
        source: 'ocr',
      };
    }
    return { ...base, note: 'Unsupported file type for automatic extraction.' };
  } catch (err) {
    return { ...base, status: 'error', note: err?.message || `Failed to extract ${ext.toUpperCase()} text.` };
  }
}

export async function loadSubmissionFilePreviewImpl(
  file = {},
  { maxChars = DEFAULT_MAX_CHARS_PER_FILE * 2, pageLimit = 8 } = {},
) {
  const ext = getSubmissionFileExtension(file?.name);
  const url = String(file?.url || '');
  const base = {
    name: String(file?.name || 'file'),
    ext,
    url,
    kind: 'unsupported',
    html: '',
    text: '',
    note: '',
  };

  if (!url) return { ...base, note: 'Missing file URL.' };

  try {
    if (ext === 'pdf') {
      return {
        ...base,
        kind: 'iframe',
        note: 'PDF preview loaded inside the app.',
      };
    }

    if (OCR_IMAGE_EXTENSIONS.has(ext)) {
      return {
        ...base,
        kind: 'image',
        note: 'Image preview loaded inside the app.',
      };
    }

    if (ext === 'txt') {
      const text = await _fetchText(url);
      return {
        ...base,
        kind: 'text',
        text: truncateSubmissionText(text, maxChars),
        note: 'Plain-text file loaded inside the app.',
      };
    }

    if (ext === 'docx') {
      const buffer = await _fetchArrayBuffer(url);
      let html = '';
      try {
        html = await _renderDocxHtml(buffer);
      } catch {
        html = '';
      }

      if (html) {
        return {
          ...base,
          kind: 'html',
          html,
          note: 'DOCX rendered inside the app. Layout is approximate rather than full Word fidelity.',
        };
      }

      let text = '';
      try {
        text = await _extractDocxText(buffer, { maxChars });
      } catch {
        text = '';
      }
      if (!text) text = await _extractDocxTextFallback(buffer, { maxChars });

      return {
        ...base,
        kind: text ? 'text' : 'unsupported',
        text,
        note: text
          ? 'DOCX text extracted inside the app. Rich layout could not be rendered.'
          : 'This DOCX file could not be rendered or extracted for in-app preview.',
      };
    }

    const extracted = await extractSubmissionFileTextImpl(file, { maxChars, pageLimit });
    return {
      ...base,
      kind: extracted?.text ? 'text' : 'unsupported',
      text: extracted?.text || '',
      note: extracted?.note || 'This file type is not available for in-app preview.',
    };
  } catch (err) {
    return {
      ...base,
      note: err?.message || 'The file could not be loaded for in-app preview.',
    };
  }
}
