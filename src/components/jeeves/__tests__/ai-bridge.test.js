// Run with: node --test src/components/jeeves/__tests__/ai-bridge.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { _buildGeminiContents } from '../../../ai.js';

test('emits a single function-response turn immediately after a function-call turn', () => {
  const contents = _buildGeminiContents([
    { role: 'user', content: 'Who is in group 1?' },
    {
      role: 'assistant',
      toolCalls: [
        { name: 'describe_data_model', args: {} },
        { name: 'firebase_read', args: { path: 'collaboration-groups/scopes/assessment-a1/groups/group-1' } },
      ],
    },
    { role: 'tool', name: 'describe_data_model', content: { collections: ['collaboration-groups/scopes'] } },
    { role: 'tool', name: 'firebase_read', content: { value: { members: { u1: true, u2: true } } } },
    { role: 'assistant', content: 'Group 1 has two members.' },
  ]);

  assert.equal(contents.length, 4);
  assert.equal(contents[0].role, 'user');
  assert.equal(contents[1].role, 'model');
  assert.equal(contents[1].parts.length, 2);
  assert.ok(contents[1].parts.every((part) => part.functionCall));

  assert.equal(contents[2].role, 'user');
  assert.equal(contents[2].parts.length, 2);
  assert.ok(contents[2].parts.every((part) => part.functionResponse));
  assert.equal(contents[2].parts[0].functionResponse.name, 'describe_data_model');
  assert.equal(contents[2].parts[1].functionResponse.name, 'firebase_read');

  assert.equal(contents[3].role, 'model');
  assert.deepEqual(contents[3].parts, [{ text: 'Group 1 has two members.' }]);
});
