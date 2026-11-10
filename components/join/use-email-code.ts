import { authClient } from '@/lib/client/auth';
import { useState } from 'react';

export type EmailCodeError = 'rate-limited' | 'code-wrong' | 'code-expired' | 'code-attempts' | 'generic';

type AuthError = { status?: number; code?: string } | null;

const toCodeError = (error: NonNullable<AuthError>): EmailCodeError => {
  if (error.status === 429) return 'rate-limited';
  if (error.code === 'OTP_EXPIRED') return 'code-expired';
  if (error.code === 'TOO_MANY_ATTEMPTS') return 'code-attempts';
  if (error.code === 'INVALID_OTP') return 'code-wrong';
  return 'generic';
};

/**
 * Verifies an email with the sign-in email (6-digit code + magic link back to `returnTo`).
 * A verified email is a session, so nothing is sent on anyone's behalf before this (43).
 */
export const useEmailCode = (returnTo: string) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<EmailCodeError | null>(null);

  const run = async (action: () => Promise<{ error: AuthError }>) => {
    setBusy(true);
    setError(null);
    const result = await action().catch(() => ({ error: {} }));
    setBusy(false);
    if (result.error) setError(toCodeError(result.error));
    return !result.error;
  };

  return {
    busy,
    error,
    send: (email: string) =>
      run(() =>
        authClient.signIn.magicLink({ email, callbackURL: returnTo, errorCallbackURL: returnTo })
      ),
    verify: (email: string, otp: string) => run(() => authClient.signIn.emailOtp({ email, otp })),
  };
};
