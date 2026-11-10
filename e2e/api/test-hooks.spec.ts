// The test-only triggers are open on the e2e server (E2E_TEST_HOOKS=1). That they're closed
// without the flag, and in production even with it, is tests/test-hooks.check.mjs (pnpm test):
// the gate is a pure function of the environment, so a second server just to see NOT_FOUND
// would only re-test that function.
import { expect, ok, test } from '../fixtures';

// 2000-01-01: nothing is due that early, so these don't touch other tests' data.
const now = '2000-01-01T00:00:00.000Z';

test('draw.runDue is open under E2E_TEST_HOOKS', async ({ newClient }) => {
  const { trpc } = await newClient();
  expect(ok(await trpc.mutate('draw.runDue', { now, editionIds: [] }))).toEqual({ drawn: [], failed: [] });
});

test('giftday.runDue is open under E2E_TEST_HOOKS', async ({ newClient }) => {
  const { trpc } = await newClient();
  expect(ok(await trpc.mutate('giftday.runDue', { now }))).toEqual({ giftday: [], done: [] });
});
