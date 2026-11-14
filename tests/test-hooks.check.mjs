// Run: pnpm test (or node --import ./tests/ts-hooks.mjs tests/test-hooks.check.mjs)
// The cron endpoint (pages/api/cron/[job].ts) reads a test run's time and scope only when this gate is open;
// e2e/api/test-hooks.spec.ts checks it's wired to it (open under the e2e server's flag).
import assert from 'node:assert/strict';
import { testHooksEnabled } from '../lib/server/test-hooks.ts';

assert.equal(testHooksEnabled({}), false, 'closed without the flag');
assert.equal(testHooksEnabled({ NODE_ENV: 'development' }), false, 'next dev alone does not open them');
assert.equal(testHooksEnabled({ E2E_TEST_HOOKS: 'true' }), false, 'only exactly 1');
assert.equal(testHooksEnabled({ E2E_TEST_HOOKS: '1' }), true, 'open with the flag');
assert.equal(testHooksEnabled({ E2E_TEST_HOOKS: '1', NODE_ENV: 'production', VERCEL_ENV: 'preview' }), true, 'next start, preview');
assert.equal(testHooksEnabled({ E2E_TEST_HOOKS: '1', VERCEL_ENV: 'production' }), false, 'never in production');

console.log('ok  test hooks: only with E2E_TEST_HOOKS=1, never in production');
