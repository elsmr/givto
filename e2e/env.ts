// Ports and the app's environment for the e2e run. Fixed defaults (slice `e2e`); override the
// ports to run several checkouts at once: E2E_APP_PORT, E2E_MAIL_PORT, E2E_MONGO_PORT.
import path from 'node:path';

const port = (name: string, fallback: number) => Number(process.env[name] || fallback);

export const APP_PORT = port('E2E_APP_PORT', 5001);
export const MAIL_PORT = port('E2E_MAIL_PORT', 5091);
export const MONGO_PORT = port('E2E_MONGO_PORT', 27061);

export const BASE_URL = `http://localhost:${APP_PORT}`;
export const MAIL_URL = `http://localhost:${MAIL_PORT}`;
export const MONGO_CONTAINER = `givto-mongo-e2e-${MONGO_PORT}`;
export const MONGODB_URI = `mongodb://localhost:${MONGO_PORT}/?directConnection=true`;
export const MONGODB_DB = 'givto_test';
export const CRON_SECRET = 'test-cron-secret';

export const ROOT_DIR = path.resolve(import.meta.dirname, '..');
export const OUTPUT_DIR = path.join(ROOT_DIR, 'test-results');
/** The app's stdout and stderr (`next start`), for the no-secrets-in-logs checks. */
export const SERVER_LOG = path.join(OUTPUT_DIR, 'server.log');

/**
 * Every variable the app reads, so a local .env is never used (process env wins over .env in
 * Next) and no production value can leak in.
 */
export const appEnv: Record<string, string> = {
  MONGODB_URI,
  MONGODB_DB,
  MAILGUN_API_BASE: MAIL_URL,
  MAILGUN_API_KEY: 'test-key',
  BETTER_AUTH_URL: BASE_URL,
  BETTER_AUTH_SECRET: 'test-secret-test-secret-test-secret-0123',
  BETTER_AUTH_TELEMETRY: '0',
  GOOGLE_CLIENT_ID: 'test-google-client-id',
  GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
  CRON_SECRET,
  MAILGUN_WEBHOOK_SIGNING_KEY: 'test-webhook-signing-key',
  LOG_LEVEL: 'debug',
  NEXT_PUBLIC_SENTRY_DSN: '',
  JWT_SECRET_KEY: '',
  APP_HOST: '',
  VERCEL_ENV: '',
  E2E_TEST_HOOKS: '1',
};
