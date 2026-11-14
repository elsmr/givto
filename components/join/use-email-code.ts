import { authClient, throwAuthError } from '@/lib/client/auth';
import { useMutation } from '@tanstack/react-query';

export type EmailCodeError = 'rate-limited' | 'code-wrong' | 'code-expired' | 'code-attempts' | 'generic';

const toCodeError = (error: unknown): EmailCodeError => {
  const { code, status } = error as { code?: string; status?: number };
  if (status === 429) return 'rate-limited';
  if (code === 'OTP_EXPIRED') return 'code-expired';
  if (code === 'TOO_MANY_ATTEMPTS') return 'code-attempts';
  if (code === 'INVALID_OTP') return 'code-wrong';
  return 'generic';
};

/**
 * Verifies an email with the sign-in email (6-digit code + magic link back to `returnTo`).
 * A verified email is a session, so nothing is sent on anyone's behalf before this (43).
 */
export const useEmailCode = (returnTo: string) => {
  const run = useMutation({ mutationFn: (action: () => Promise<{ error: unknown }>) => throwAuthError(action()) });
  // Resolves to whether it worked; the error is in `error`.
  const call = (action: () => Promise<{ error: unknown }>) => run.mutateAsync(action).then(() => true, () => false);

  return {
    busy: run.isPending,
    error: run.error && toCodeError(run.error),
    send: (email: string) =>
      call(() => authClient.signIn.magicLink({ email, callbackURL: returnTo, errorCallbackURL: returnTo })),
    verify: (email: string, otp: string) => call(() => authClient.signIn.emailOtp({ email, otp })),
  };
};
