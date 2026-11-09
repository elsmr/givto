import * as Sentry from '@sentry/nextjs';
import { SENTRY_DSN, sentryOptions } from './lib/sentry-options';

export async function register() {
  if (SENTRY_DSN && process.env.NEXT_RUNTIME === 'nodejs') Sentry.init(sentryOptions);
}

// Errors thrown in API routes and page rendering. tRPC catches its own: see reportUnexpected (lib/server/errors.ts).
export const onRequestError = Sentry.captureRequestError;
