import {
  DEFAULT_MAX_CHARS_PER_FILE,
  DEFAULT_MAX_FILES,
  DEFAULT_PDF_PAGE_LIMIT,
  DEFAULT_TOTAL_MAX_CHARS,
  SUPPORTED_EXTENSIONS,
  getSubmissionFileExtension,
} from './document-text-shared.js';

const _extractCache = new Map();
let _extractorsPromise = null;

function _cacheKey(file = {}) {
  return `${file.url || ''}|${file.name || ''}|${file.size || ''}`;
}

async function _loadExtractors() {
  if (!_extractorsPromise) {
    _extractorsPromise = import('./document-text-extractors.js');
  }
  return _extractorsPromise;
}

export function isExtractableSubmissionFile(file = {}) {
  return SUPPORTED_EXTENSIONS.has(getSubmissionFileExtension(file.name));
}

export async function extractSubmissionFileText(
  file = {},
  { maxChars = DEFAULT_MAX_CHARS_PER_FILE, pageLimit = DEFAULT_PDF_PAGE_LIMIT } = {},
) {
  const key = _cacheKey(file);
  if (_extractCache.has(key)) return _extractCache.get(key);

  const promise = (async () => {
    const { extractSubmissionFileTextImpl } = await _loadExtractors();
    return extractSubmissionFileTextImpl(file, { maxChars, pageLimit });
  })();

  _extractCache.set(key, promise);
  return promise;
}

export async function extractSubmissionBundle(
  files = [],
  {
    maxFiles = DEFAULT_MAX_FILES,
    maxCharsPerFile = DEFAULT_MAX_CHARS_PER_FILE,
    totalMaxChars = DEFAULT_TOTAL_MAX_CHARS,
    pageLimit = DEFAULT_PDF_PAGE_LIMIT,
  } = {},
) {
  const candidates = (Array.isArray(files) ? files : []).filter(Boolean);
  const supported = candidates.filter(isExtractableSubmissionFile).slice(0, maxFiles);
  const unsupported = candidates
    .filter((file) => !isExtractableSubmissionFile(file))
    .map((file) => ({
      name: String(file?.name || 'file'),
      ext: getSubmissionFileExtension(file?.name),
      status: 'unsupported',
      text: '',
      note: 'Unsupported file type.',
    }));

  const results = [];
  let usedChars = 0;

  for (const file of supported) {
    if (usedChars >= totalMaxChars) break;
    const remaining = Math.max(0, totalMaxChars - usedChars);
    const extracted = await extractSubmissionFileText(file, {
      maxChars: Math.min(maxCharsPerFile, remaining),
      pageLimit,
    });
    results.push(extracted);
    usedChars += extracted.text.length;
  }

  return {
    results,
    unsupported,
    usedChars,
    totalFiles: candidates.length,
    extractedFiles: results.filter((item) => item.status === 'ok' && item.text).length,
  };
}

export function serializeExtractionBundle(bundle = {}) {
  const results = Array.isArray(bundle?.results) ? bundle.results : [];
  const unsupported = Array.isArray(bundle?.unsupported) ? bundle.unsupported : [];
  return {
    generatedAt: new Date().toISOString(),
    results: results.map((item) => ({
      name: String(item?.name || 'file'),
      ext: String(item?.ext || ''),
      status: String(item?.status || 'unknown'),
      text: String(item?.text || ''),
      note: String(item?.note || ''),
      source: String(item?.source || ''),
    })),
    unsupported: unsupported.map((item) => ({
      name: String(item?.name || 'file'),
      ext: String(item?.ext || ''),
      status: String(item?.status || 'unsupported'),
      text: '',
      note: String(item?.note || 'Unsupported file type.'),
      source: '',
    })),
    usedChars: Number(bundle?.usedChars) || 0,
    totalFiles: Number(bundle?.totalFiles) || 0,
    extractedFiles: Number(bundle?.extractedFiles) || 0,
  };
}

export async function loadSubmissionFilePreview(
  file = {},
  {
    maxChars = DEFAULT_MAX_CHARS_PER_FILE * 2,
    pageLimit = DEFAULT_PDF_PAGE_LIMIT,
  } = {},
) {
  const { loadSubmissionFilePreviewImpl } = await _loadExtractors();
  return loadSubmissionFilePreviewImpl(file, { maxChars, pageLimit });
}

export function describeExtractionBundle(bundle = {}) {
  const results = Array.isArray(bundle?.results) ? bundle.results : [];
  const unsupported = Array.isArray(bundle?.unsupported) ? bundle.unsupported : [];
  const extractedFiles = results.filter((item) => item.status === 'ok' && item.text).length;
  const ocrFiles = results.filter((item) => item.status === 'ok' && item.text && item.source === 'ocr').length;
  const warnings = results.filter((item) => item.status !== 'ok').length + unsupported.length;
  const parts = [];
  if (extractedFiles) parts.push(`Automatic content extraction succeeded for ${extractedFiles} file(s).`);
  if (ocrFiles) parts.push(`OCR was used for ${ocrFiles} file(s).`);
  if (!extractedFiles) parts.push('No submission text could be extracted automatically.');
  if (warnings) parts.push(`${warnings} file(s) were empty, unsupported, or failed extraction.`);
  return parts.join(' ');
}

export function formatExtractionDiagnostics(bundle = {}) {
  const results = Array.isArray(bundle?.results) ? bundle.results : [];
  const unsupported = Array.isArray(bundle?.unsupported) ? bundle.unsupported : [];
  const lines = [];

  results.forEach((item, idx) => {
    const status = item?.status || 'unknown';
    const source = item?.source ? ` via ${item.source}` : '';
    const charCount = item?.text ? ` (${item.text.length} chars)` : '';
    const note = item?.note ? ` ${item.note}` : '';
    lines.push(`${idx + 1}. ${item?.name || 'file'} — ${status}${source}${charCount}.${note}`.trim());
  });

  unsupported.forEach((item, idx) => {
    lines.push(`${results.length + idx + 1}. ${item?.name || 'file'} — unsupported. ${item?.note || 'Unsupported file type.'}`.trim());
  });

  return lines.join('\n').trim();
}

export function formatExtractionBundleForPrompt(bundle = {}) {
  const results = Array.isArray(bundle?.results) ? bundle.results : [];
  const unsupported = Array.isArray(bundle?.unsupported) ? bundle.unsupported : [];
  const blocks = [];

  results.forEach((item) => {
    if (item.status === 'ok' && item.text) {
      blocks.push(`[Extracted from ${item.name}]\n${item.text}`);
    } else {
      blocks.push(`[${item.name}] ${item.note || 'No extractable text available.'}`);
    }
  });

  unsupported.forEach((item) => {
    blocks.push(`[${item.name}] ${item.note || 'Unsupported file type for automatic extraction.'}`);
  });

  return blocks.join('\n\n').trim();
}
