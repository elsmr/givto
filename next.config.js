import { withSentryConfig } from '@sentry/nextjs/config';

export default withSentryConfig(
  {
    // No `i18n`: only the indexable pages have the language in the URL, as pages/nl/ (81).
    // The dashboard moved; old links and bookmarks keep working.
    redirects: async () => [{ source: '/groups', destination: '/app', permanent: true }],
    poweredByHeader: false,
    headers: async () => [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Join and invite links carry their token in the URL.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
        ],
      },
    ],
    experimental: { globalNotFound: true },
    // Build-time: the sign-in pages are static. The server reads GOOGLE_CLIENT_ID at runtime (lib/server/auth.ts).
    env: { GOOGLE_SIGN_IN: process.env.GOOGLE_CLIENT_ID ? '1' : '' },
  },
  {
    // Source maps upload only when SENTRY_AUTH_TOKEN, SENTRY_ORG and SENTRY_PROJECT are set.
    silent: !process.env.CI,
    telemetry: false,
    // No tracing, so no build-time instrumentation of server dependencies.
    buildTimeInstrumentation: false,
  }
);
