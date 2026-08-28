// Quote-matching tests for src/quote-match.js — the rules behind the annotated
// script students see under posted feedback.
// Run with: node --test src/__tests__/quote-match.test.js

import test from 'node:test';
import assert from 'node:assert/strict';
import { findQuoteMatches, collapseWhitespace } from '../quote-match.js';

const sliceAll = (text, matches) => matches.map((m) => text.slice(m.start, m.end));

test('finds an exact quote', () => {
  const text = 'The filter bubble narrowed my feed considerably.';
  assert.deepEqual(findQuoteMatches(text, 'filter bubble'), [{ start: 4, end: 17 }]);
});

test('finds every occurrence of a repeated quote', () => {
  const text = 'a filter bubble, then another filter bubble';
  const hits = findQuoteMatches(text, 'filter bubble');
  assert.equal(hits.length, 2);
  assert.deepEqual(sliceAll(text, hits), ['filter bubble', 'filter bubble']);
});

test('falls back to a case-insensitive match', () => {
  const text = 'The Filter Bubble narrowed my feed.';
  assert.deepEqual(sliceAll(text, findQuoteMatches(text, 'filter bubble')), ['Filter Bubble']);
});

// The case this was written for: PDF extraction keeps the page's hard line
// breaks, while the model quotes back running prose. Before the whitespace
// tolerant tier every annotation on a PDF-sourced script silently lost its
// highlight, so the student saw comment cards beside unmarked text.
test('matches across the hard line breaks left by PDF extraction', () => {
  const text = 'This was to indicate that I was inside a filter bubble whereby the only\n videos that appeared were the ones I once viewed or liked.';
  const quote = 'I was inside a filter bubble whereby the only videos that appeared were the ones I once viewed or liked.';
  const hits = findQuoteMatches(text, quote);
  assert.equal(hits.length, 1);
  // Reported in ORIGINAL coordinates, so the slice covers the line break too.
  assert.equal(text.slice(hits[0].start, hits[0].end), 'I was inside a filter bubble whereby the only\n videos that appeared were the ones I once viewed or liked.');
  assert.equal(hits[0].end, text.length);
});

test('a whitespace-tolerant match still ends on the quote, not the line', () => {
  const text = 'Intro.\nTeachers can use YouTube\n  to organize information.\nOutro.';
  const hits = findQuoteMatches(text, 'Teachers can use YouTube to organize information.');
  assert.equal(hits.length, 1);
  assert.equal(text.slice(hits[0].start, hits[0].end), 'Teachers can use YouTube\n  to organize information.');
  assert.equal(text.slice(hits[0].end), '\nOutro.');
});

test('returns nothing when the quote is absent', () => {
  assert.deepEqual(findQuoteMatches('A paragraph with nothing relevant.', 'not present anywhere'), []);
});

test('returns nothing for empty input on either side', () => {
  assert.deepEqual(findQuoteMatches('', 'anything'), []);
  assert.deepEqual(findQuoteMatches('some text', ''), []);
  assert.deepEqual(findQuoteMatches('some text', '   \n  '), []);
});

test('an exact match is never widened by a later tier', () => {
  // Both an exact and a case-variant occurrence exist; only the exact one wins.
  const text = 'filter bubble and Filter Bubble';
  assert.deepEqual(findQuoteMatches(text, 'filter bubble'), [{ start: 0, end: 13 }]);
});

test('collapseWhitespace maps every kept character back to its origin', () => {
  const source = '  a\n\n b  c ';
  const { text, offsets } = collapseWhitespace(source);
  assert.equal(text, 'a b c');
  assert.equal(offsets.length, text.length);
  // Each non-space character must point at itself in the original.
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] !== ' ') assert.equal(source[offsets[i]], text[i]);
  }
});
