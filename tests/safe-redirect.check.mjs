// Run: pnpm test (or node --import ./tests/ts-hooks.mjs tests/safe-redirect.check.mjs)
import assert from 'node:assert/strict';
import { safeRedirect } from '../lib/client/auth.ts';

for (const [target, expected] of [
  ['/g/abc', '/g/abc'],
  ['/g/abc/join?invite=x#top', '/g/abc/join?invite=x#top'],
  ['/', '/'],
]) {
  assert.equal(safeRedirect(target, '/app'), expected, `changed: ${JSON.stringify(target)}`);
}
for (const target of [
  '//evil.test',
  '/\\evil.test',
  '/\t/evil.test',
  '/\n/evil.test',
  '/\r/evil.test',
  '/\t\\evil.test',
  '/x\\..\\..\\/evil.test',
  '\t//evil.test',
  'https://evil.test',
  'javascript:alert(1)',
  'app',
  '',
  undefined,
  ['/g/abc'],
]) {
  assert.equal(safeRedirect(target, '/app'), '/app', `allowed: ${JSON.stringify(target)}`);
}
console.log('safe-redirect check ok');
