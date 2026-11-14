/**
 * Running a scheduled job at a chosen time and for chosen editions and groups (the JSON body of pages/api/cron/[job].ts)
 * is open only with E2E_TEST_HOOKS=1, so e2e tests can use it against `next start`. Never on
 * Vercel production, even with the flag set.
 */
export const testHooksEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  env.E2E_TEST_HOOKS === '1' && env.VERCEL_ENV !== 'production';
