import { SENTRY_DSN, sentryOptions } from './lib/sentry-options';

// Browser errors: uncaught errors and unhandled rejections; render errors go through pages/_error.tsx.
// Loaded on its own so it never holds up the first render; errors before it loads go unreported.
if (SENTRY_DSN) void import('@sentry/nextjs').then((Sentry) => Sentry.init(sentryOptions));
