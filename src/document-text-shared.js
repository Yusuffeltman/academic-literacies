export const OCR_IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp']);
export const SUPPORTED_EXTENSIONS = new Set(['pdf', 'docx', 'txt', ...OCR_IMAGE_EXTENSIONS]);
export const DEFAULT_MAX_FILES = 4;
export const DEFAULT_MAX_CHARS_PER_FILE = 5000;
export const DEFAULT_TOTAL_MAX_CHARS = 14000;
export const DEFAULT_PDF_PAGE_LIMIT = 8;
export const DEFAULT_PDF_OCR_PAGE_LIMIT = 3;
export const MIN_PDF_TEXT_LAYER_CHARS = 24;

export function getSubmissionFileExtension(name = '') {
  return String(name || '').split('.').pop()?.toLowerCase() || '';
}

export function normalizeSubmissionText(value = '', max = DEFAULT_MAX_CHARS_PER_FILE) {
  return String(value || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
    .slice(0, max);
}

export function truncateSubmissionText(value = '', max = DEFAULT_MAX_CHARS_PER_FILE) {
  const text = normalizeSubmissionText(value, max + 1);
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}
