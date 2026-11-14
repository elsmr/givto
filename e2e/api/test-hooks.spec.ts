// The cron endpoint's test runs (a chosen time, scoped) are open on the e2e server (E2E_TEST_HOOKS=1). That they're closed
// without the flag, and in production even with it, is tests/test-hooks.check.mjs (pnpm test):
// the gate is a pure function of the environment, so a second server just to see the body ignored
// would only re-test that function.
import { expect, runJob, test } from '../fixtures';

// 2000-01-01: nothing is due that early, so these don't touch other tests' data.
const now = '2000-01-01T00:00:00.000Z';

test('the draws job runs at a chosen time under E2E_TEST_HOOKS', async () => {
  expect(await runJob('draws', { now, editionIds: [] })).toEqual({ drawn: [], failed: [] });
});

test('the gift day job runs at a chosen time under E2E_TEST_HOOKS', async () => {
  expect(await runJob('giftday', { now })).toEqual({ giftday: [], done: [] });
});
