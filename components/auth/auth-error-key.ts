type AuthError = { code?: string; status?: number } | null | undefined;

/** Better Auth's error codes, as keys under `auth.errors`. */
export const authErrorKey = (error: AuthError) => {
  if (error?.status === 429 || error?.code === 'RATE_LIMITED') return 'rate-limited';
  if (error?.code === 'INVALID_OTP') return 'invalid-code';
  if (error?.code === 'OTP_EXPIRED') return 'expired-code';
  if (error?.code === 'TOO_MANY_ATTEMPTS') return 'too-many-attempts';
  if (error?.code === 'INVALID_EMAIL' || error?.code === 'VALIDATION_ERROR') return 'invalid-email';
  return 'generic';
};
export type AuthErrorKey = ReturnType<typeof authErrorKey>;
