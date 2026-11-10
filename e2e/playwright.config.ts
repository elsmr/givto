// Run `pnpm build` first: the app runs as `next start`. See e2e/README.md.
import { defineConfig, devices } from '@playwright/test';
import { APP_PORT, appEnv, BASE_URL, MAIL_PORT, MAIL_URL, OUTPUT_DIR, ROOT_DIR, SERVER_LOG } from './env';

const CI = Boolean(process.env.CI);
/** Specs that run the cron jobs at real time (see the `api-cron` project). */
const CRON_SPECS = '**/api/s7-*.spec.ts';

export default defineConfig({
  testDir: '.',
  outputDir: OUTPUT_DIR,
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: `${ROOT_DIR}/playwright-report` }]],
  globalSetup: './global-setup.ts',
  use: {
    baseURL: BASE_URL,
    locale: 'en-US',
    trace: 'on-first-retry',
  },
  projects: [
    // API specs don't use a browser: they run once, in their own projects.
    { name: 'api', testMatch: '**/api/**/*.spec.ts', testIgnore: CRON_SPECS, use: { ...devices['Desktop Chrome'] } },
    // Real-time cron jobs act on the whole database: whatever any test left due by now, mails
    // rendered on the app's event loop. They run after the other API specs, so they never touch or
    // stall them. (A dependency runs all its tests whatever the filter: only `api` here.)
    { name: 'api-cron', testMatch: CRON_SPECS, dependencies: ['api'], timeout: 180_000, use: { ...devices['Desktop Chrome'] } },
    { name: 'desktop', testIgnore: '**/api/**', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', testIgnore: '**/api/**', use: { ...devices['Pixel 7'], viewport: { width: 375, height: 812 } } },
  ],
  // Started before globalSetup (Mongo), so the readiness checks don't touch the database.
  webServer: [
    {
      command: 'node tests/mail-mock.mjs',
      cwd: ROOT_DIR,
      url: `${MAIL_URL}/messages`,
      env: { MAIL_PORT: String(MAIL_PORT) },
      reuseExistingServer: false,
    },
    {
      // keepAliveTimeout above Node's 5s: a test's request context that idles longer would otherwise
      // reuse a socket the server is closing (ECONNRESET).
      command: `mkdir -p "${OUTPUT_DIR}" && pnpm exec next start -p ${APP_PORT} --keepAliveTimeout 70000 > "${SERVER_LOG}" 2>&1`,
      cwd: ROOT_DIR,
      url: `${BASE_URL}/robots.txt`,
      env: appEnv,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
