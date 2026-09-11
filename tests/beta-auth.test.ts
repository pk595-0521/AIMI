import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveBetaRole, signupInput } from '../server/beta-signup';
import { canAccessPortal, homeForRole } from '../src/auth-roles';
test('invite keys are exact, server-configurable, and default to candidate', () => {
  for (const key of ['', 'unknown', 'grader2026', ' GRADER2026']) assert.equal(resolveBetaRole(key, {}), 'candidate');
  assert.equal(resolveBetaRole('GRADER2026', {}), 'grader');
  assert.equal(resolveBetaRole('ADMIN2026', {}), 'admin');
  const env = { BETA_ADMIN_KEY: 'rotated-admin', BETA_GRADER_KEY: 'rotated-grader' };
  assert.equal(resolveBetaRole('ADMIN2026', env), 'candidate');
  assert.equal(resolveBetaRole('GRADER2026', env), 'candidate');
  assert.equal(resolveBetaRole('rotated-admin', env), 'admin');
  assert.equal(resolveBetaRole('rotated-grader', env), 'grader');
});
test('signup rejects forged role and metadata properties', () => {
  const input = { name: 'Beta Tester', email: 'beta@example.test', password: 'test-password' };
  assert.equal(signupInput.safeParse(input).success, true);
  for (const extra of [{ role: 'admin' }, { app_metadata: { beta_role: 'admin' } }, { user_metadata: { role: 'admin' } }]) assert.equal(signupInput.safeParse({ ...input, ...extra }).success, false);
});
test('portal access matrix and landing routes preserve roles', () => {
  for (const [role, permissions, home] of [
    ['APPLICANT', [true, false, false], '/assessment'],
    ['GRADER', [false, true, false], '/grader'],
    ['EMPLOYER_ADMIN', [true, true, true], '/employer'],
    ['SYSTEM_ADMIN', [true, true, true], '/employer'],
    ['unknown', [false, false, false], '/assessment'],
  ] as const) {
    assert.deepEqual(['assessment', 'grader', 'employer'].map(portal => canAccessPortal(role, portal as any)), permissions);
    assert.equal(homeForRole(role), home);
  }
});
