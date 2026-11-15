import { passkeyClient } from '@better-auth/passkey/client';
import { emailOTPClient, inferAdditionalFields, magicLinkClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import type { Auth } from '../server/auth';

/** Same-origin client: sign in (magic link, code, passkey), session, sign out. */
export const authClient = createAuthClient({
  plugins: [magicLinkClient(), emailOTPClient(), passkeyClient(), inferAdditionalFields<Auth>()],
});

const PLACEHOLDER_ORIGIN = 'https://givto.invalid';

/**
 * Only same-origin paths ("/g/abc"), never "//evil.test" or "https://…": no open redirects.
 * URL parsers drop tabs and line breaks and read `\` as `/`, so "/\t/evil.test" would leave the site.
 * Dot segments normalise away ("/.//evil.test" → "//evil.test"), so the returned path is checked again.
 */
export const safeRedirect = (target: unknown, fallback = '/'): string => {
  if (typeof target !== 'string' || !target.startsWith('/') || /[\u0000-\u001f\u007f\\]/.test(target)) return fallback;
  const url = new URL(target, PLACEHOLDER_ORIGIN);
  if (url.origin !== PLACEHOLDER_ORIGIN || url.pathname.startsWith('//')) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
};

/** Better Auth resolves with `{ error }` instead of rejecting: this rejects with it, so useMutation sees the failure. */
export const throwAuthError = async <T extends { error?: unknown } | null | undefined>(pending: Promise<T>) => {
  const result = await pending;
  if (result?.error) throw result.error;
  return result;
};
