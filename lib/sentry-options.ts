import type { Breadcrumb, ErrorEvent } from '@sentry/nextjs';
import { scrub } from './scrub';

// Sentry gets the error, where it happened and the path, never personal data (44): no emails,
// codes, tokens, cookies, request bodies, query strings or wish text. Same scrubbing as the log.

const pathOnly = (url: unknown) => (typeof url === 'string' ? url.split(/[?#]/)[0] : undefined);

const KEPT_BREADCRUMBS = new Set(['navigation', 'fetch', 'xhr', 'http']);

/** Requests and navigations as method, status and path only; console and UI breadcrumbs can hold text. */
const scrubBreadcrumb = (crumb: Breadcrumb): Breadcrumb | null =>
  crumb.category && KEPT_BREADCRUMBS.has(crumb.category)
    ? {
        type: crumb.type,
        category: crumb.category,
        level: crumb.level,
        timestamp: crumb.timestamp,
        data: crumb.data && {
          method: crumb.data.method,
          status_code: crumb.data.status_code,
          url: pathOnly(crumb.data.url),
          from: pathOnly(crumb.data.from),
          to: pathOnly(crumb.data.to),
        },
      }
    : null;

const scrubEvent = (event: ErrorEvent): ErrorEvent => ({
  ...event,
  message: event.message && scrub(event.message),
  exception: event.exception && {
    values: event.exception.values?.map((value) => ({ ...value, value: value.value && scrub(value.value) })),
  },
  request: event.request && { method: event.request.method, url: pathOnly(event.request.url) },
  user: event.user?.id ? { id: event.user.id } : undefined,
  extra: undefined,
  breadcrumbs: event.breadcrumbs?.flatMap((crumb) => scrubBreadcrumb(crumb) ?? []),
});

/** Inlined at build time, so client and server read the same value. Unset: Sentry stays off. */
export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

/** Shared by the browser (instrumentation-client.ts) and server (instrumentation.ts) init. */
export const sentryOptions = {
  dsn: SENTRY_DSN,
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
    databaseQueryData: false,
    queues: false,
    stackFrameVariables: false,
    genAI: { inputs: false, outputs: false },
  },
  beforeSend: scrubEvent,
};
