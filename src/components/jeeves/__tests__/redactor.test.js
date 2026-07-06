// Run with: node --test src/components/jeeves/__tests__/redactor.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRedactor } from '../redactor.js';

test('scrubs roster names and rehydrates them', () => {
  const r = createRedactor([
    { name: 'Thandi Mokoena' },
    { name: 'Sipho Dlamini' },
  ]);
  const scrubbed = r.scrub('Thandi Mokoena submitted before Sipho Dlamini.');
  assert.match(scrubbed, /\{student_\d+\}/);
  assert.doesNotMatch(scrubbed, /Thandi|Sipho/);

  // The LLM would echo the tokens verbatim; rehydrate must restore them.
  const restored = r.rehydrate(scrubbed);
  assert.equal(restored, 'Thandi Mokoena submitted before Sipho Dlamini.');
});

test('scrubs email addresses regardless of roster', () => {
  const r = createRedactor([]);
  const out = r.scrub('Contact me at lecturer@uj.ac.za please.');
  assert.equal(out, 'Contact me at {email} please.');
});

test('empty roster still works on plain text', () => {
  const r = createRedactor([]);
  assert.equal(r.scrub('hello world'), 'hello world');
  assert.equal(r.size(), 0);
});

test('name match is case-insensitive but word-bounded', () => {
  const r = createRedactor([{ name: 'Sam' }]);
  const scrubbed = r.scrub('sam and SAMUEL arrived');
  assert.match(scrubbed, /\{student_1\}/); // matched "sam"
  assert.match(scrubbed, /SAMUEL/);         // NOT matched
});
