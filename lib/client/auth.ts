import { passkeyClient } from '@better-auth/passkey/client';
import { emailOTPClient, inferAdditionalFields, magicLinkClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import type { Auth } from '../server/auth';

/** Same-origin client: sign in (magic link, code, passkey), session, sign out. */
export const authClient = createAuthClient({
  plugins: [magicLinkClient(), emailOTPClient(), passkeyClient(), inferAdditionalFields<Auth>()],
});
