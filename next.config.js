import { withSentryConfig } from '@sentry/nextjs/config';

export default withSentryConfig(
  {
    // No `i18n`: only the indexable pages have the language in the URL, as pages/nl/ (81).
    // The dashboard moved; old links and bookmarks keep working.
    redirects: async () => [{ source: '/groups', destination: '/app', permanent: true }],
    experimental: { globalNotFound: true },
  },
  {
    // Source maps upload only when SENTRY_AUTH_TOKEN, SENTRY_ORG and SENTRY_PROJECT are set.
    silent: !process.env.CI,
    telemetry: false,
    // No tracing, so no build-time instrumentation of server dependencies.
    buildTimeInstrumentation: false,
  }
);
