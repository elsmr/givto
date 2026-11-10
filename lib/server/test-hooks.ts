/**
 * Test-only procedures (`draw.runDue`, `giftday.runDue`: run the scheduled jobs at a chosen time) are
 * open only with E2E_TEST_HOOKS=1, so e2e tests can use them against `next start`. Never on
 * Vercel production, even with the flag set.
 */
export const testHooksEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  env.E2E_TEST_HOOKS === '1' && env.VERCEL_ENV !== 'production';
