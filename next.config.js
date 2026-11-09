import { withSentryConfig } from '@sentry/nextjs/config';

export default withSentryConfig(
  {
    i18n: {
      locales: ['en', 'nl'],
      defaultLocale: 'en',
    },
  },
  {
    // Source maps upload only when SENTRY_AUTH_TOKEN, SENTRY_ORG and SENTRY_PROJECT are set.
    silent: !process.env.CI,
    telemetry: false,
    // No tracing, so no build-time instrumentation of server dependencies.
    buildTimeInstrumentation: false,
  }
);
