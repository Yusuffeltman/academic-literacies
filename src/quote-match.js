// Locating a marker's or the model's quote inside a student's submission text.
//
// Kept free of Firebase and DOM imports so the matching rules can be tested
// directly, the way src/account-merge.js is. The grading interface renders the
// spans this returns; it does not decide what counts as a match.

// Every match is reported as { start, end } offsets into the ORIGINAL text, so
// callers can slice the untouched submission regardless of which tier matched.
function findLiteralMatches(text = '', quote = '', caseInsensitive = false) {
  const source = String(text || '');
  const target = String(quote || '');
  if (!source || !target) return [];
  const haystack = caseInsensitive ? source.toLowerCase() : source;
  const needle = caseInsensitive ? target.toLowerCase() : target;
  const matches = [];
  let start = 0;
  while (start < haystack.length) {
    const idx = haystack.indexOf(needle, start);
    if (idx === -1) break;
    matches.push({ start: idx, end: idx + target.length });
    start = idx + Math.max(target.length, 1);
  }
  return matches;
}

// Collapse whitespace runs to a single space, keeping a map from each collapsed
// character back to its offset in the original text so a hit found against the
// collapsed form can be translated back into original coordinates.
function collapseWhitespace(source = '') {
  const chars = [];
  const offsets = [];
  let pendingSpace = false;
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    if (/\s/.test(ch)) {
      pendingSpace = chars.length > 0;
      continue;
    }
    if (pendingSpace) {
      chars.push(' ');
      offsets.push(i);
      pendingSpace = false;
    }
    chars.push(ch);
    offsets.push(i);
  }
  return { text: chars.join(''), offsets };
}

// PDF extraction keeps the page's hard line breaks, but the model quotes back
// running prose, so an otherwise verbatim quote fails a plain substring search.
// Retry with whitespace collapsed on both sides and translate the hit back.
function findWhitespaceTolerantMatches(text = '', quote = '') {
  const source = collapseWhitespace(String(text || ''));
  const needle = collapseWhitespace(String(quote || '')).text;
  if (!source.text || !needle) return [];

  const haystack = source.text.toLowerCase();
  const target = needle.toLowerCase();
  const matches = [];
  let start = 0;
  while (start < haystack.length) {
    const idx = haystack.indexOf(target, start);
    if (idx === -1) break;
    matches.push({
      start: source.offsets[idx],
      end: source.offsets[idx + needle.length - 1] + 1,
    });
    start = idx + needle.length;
  }
  return matches;
}

// Exact first, then case-insensitive, then whitespace-tolerant. Each tier only
// runs when the stricter one found nothing, so a clean match is never widened.
export function findQuoteMatches(text = '', quote = '') {
  const exact = findLiteralMatches(text, quote, false);
  if (exact.length) return exact;
  const caseInsensitive = findLiteralMatches(text, quote, true);
  if (caseInsensitive.length) return caseInsensitive;
  return findWhitespaceTolerantMatches(text, quote);
}

export { findLiteralMatches, collapseWhitespace, findWhitespaceTolerantMatches };
