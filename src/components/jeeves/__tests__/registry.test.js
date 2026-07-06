// Run with: node --test src/components/jeeves/__tests__/registry.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  registerSkill,
  invokeSkill,
  getAvailableSkills,
  getToolDeclarations,
  enableScope,
  _resetRegistry,
} from '../registry.js';

test('registers and invokes a simple app-scoped skill', async () => {
  _resetRegistry();
  registerSkill({
    name: 'echo',
    description: 'echo',
    scope: 'app',
    parameters: { type: 'object', properties: { msg: { type: 'string' } } },
    handler: async ({ msg }) => ({ heard: msg }),
  });
  const out = await invokeSkill('echo', { msg: 'hi' }, { role: 'lecturer', uid: 'u1' });
  assert.deepEqual(out, { heard: 'hi' });
});

test('filters skills by role', () => {
  _resetRegistry();
  registerSkill({ name: 'lecturer_only', description: '', scope: 'app', roles: ['lecturer'], handler: async () => null, parameters: {} });
  registerSkill({ name: 'anyone', description: '', scope: 'app', handler: async () => null, parameters: {} });

  const asLecturer = getAvailableSkills({ role: 'lecturer' }).map(s => s.name).sort();
  const asStudent = getAvailableSkills({ role: 'student' }).map(s => s.name).sort();
  assert.deepEqual(asLecturer, ['anyone', 'lecturer_only']);
  assert.deepEqual(asStudent, ['anyone']);
});

test('hides skills whose scope is disabled', () => {
  _resetRegistry();
  registerSkill({ name: 'shell_exec', description: '', scope: 'desktop', handler: async () => null, parameters: {} });
  registerSkill({ name: 'navigate', description: '', scope: 'app', handler: async () => null, parameters: {} });

  assert.deepEqual(getAvailableSkills({ role: 'lecturer' }).map(s => s.name), ['navigate']);
  enableScope('desktop');
  assert.deepEqual(getAvailableSkills({ role: 'lecturer' }).map(s => s.name).sort(), ['navigate', 'shell_exec']);
});

test('rejects invoking a skill the role cannot use', async () => {
  _resetRegistry();
  registerSkill({ name: 'secret', description: '', scope: 'app', roles: ['moderator'], handler: async () => 'ok', parameters: {} });
  await assert.rejects(
    () => invokeSkill('secret', {}, { role: 'lecturer', uid: 'u1' }),
    /not available for role/,
  );
});

test('getToolDeclarations returns Gemini-shaped entries', () => {
  _resetRegistry();
  registerSkill({
    name: 'ping',
    description: 'ping',
    scope: 'app',
    parameters: { type: 'object', properties: { x: { type: 'number' } }, required: ['x'] },
    handler: async () => null,
  });
  const decls = getToolDeclarations({ role: 'lecturer' });
  assert.equal(decls.length, 1);
  assert.equal(decls[0].name, 'ping');
  assert.ok(decls[0].parameters.properties.x);
});
