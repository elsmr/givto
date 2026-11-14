import { passkeyClient } from '@better-auth/passkey/client';
import { emailOTPClient, inferAdditionalFields, magicLinkClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import type { Auth } from '../server/auth';

/** Same-origin client: sign in (magic link, code, passkey), session, sign out. */
export const authClient = createAuthClient({
  plugins: [magicLinkClient(), emailOTPClient(), passkeyClient(), inferAdditionalFields<Auth>()],
});

/** Only same-origin paths ("/g/abc"), never "//evil.test" or "https://…": no open redirects. */
export const safeRedirect = (target: unknown, fallback = '/'): string =>
  typeof target === 'string' && /^\/(?![/\\])/.test(target) ? target : fallback;

/** Better Auth resolves with `{ error }` instead of rejecting: this rejects with it, so useMutation sees the failure. */
export const throwAuthError = async <T extends { error?: unknown } | null | undefined>(pending: Promise<T>) => {
  const result = await pending;
  if (result?.error) throw result.error;
  return result;
};
