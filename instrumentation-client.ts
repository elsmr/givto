import * as Sentry from '@sentry/nextjs';
import { SENTRY_DSN, sentryOptions } from './lib/sentry-options';

// Browser errors: uncaught errors and unhandled rejections; render errors go through pages/_error.tsx.
if (SENTRY_DSN) Sentry.init(sentryOptions);
