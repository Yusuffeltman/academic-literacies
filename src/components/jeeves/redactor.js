// src/components/jeeves/redactor.js
// ─────────────────────────────────────────────
// TranscriptRedactor — scrub student PII from text before sending it to
// the LLM, then rehydrate the LLM's response so the lecturer hears the
// real names back.
//
// POPIA-oriented: names and emails from the loaded roster are replaced
// with opaque tokens. The mapping stays in-memory on the lecturer's
// device and is never persisted or transmitted.
// ─────────────────────────────────────────────

/**
 * @typedef {Object} Redactor
 * @property {(text:string)=>string} scrub
 * @property {(text:string)=>string} rehydrate
 * @property {()=>number} size
 */

/**
 * Build a redactor for the given roster.
 * @param {Array<{uid?:string, name?:string, displayName?:string, email?:string}>} roster
 * @returns {Redactor}
 */
export function createRedactor(roster = []) {
  /** @type {Map<string,string>} token -> original */
  const tokenToReal = new Map();
  /** @type {Array<{pattern:RegExp, token:string}>} */
  const rules = [];

  let i = 0;
  for (const r of roster) {
    const name = (r?.name || r?.displayName || '').trim();
    if (name && name.length > 2) {
      i += 1;
      const token = `{student_${i}}`;
      tokenToReal.set(token, name);
      rules.push({ pattern: _nameRegex(name), token });
    }
  }

  // Always strip emails, even if they're not in the roster.
  const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

  /** @param {string} text */
  function scrub(text) {
    if (!text) return text;
    let out = String(text);
    for (const { pattern, token } of rules) {
      out = out.replace(pattern, token);
    }
    out = out.replace(EMAIL_RE, '{email}');
    return out;
  }

  /** @param {string} text */
  function rehydrate(text) {
    if (!text) return text;
    let out = String(text);
    for (const [token, real] of tokenToReal) {
      // Escape braces for regex.
      const re = new RegExp(token.replace(/[{}]/g, '\\$&'), 'g');
      out = out.replace(re, real);
    }
    return out;
  }

  return { scrub, rehydrate, size: () => tokenToReal.size };
}

/** Build a case-insensitive whole-word regex for a person's name. */
function _nameRegex(name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'gi');
}
