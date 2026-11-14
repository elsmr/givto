/** Better Auth's error codes, as keys under `auth.errors`. Takes a mutation's error, which React Query types as Error. */
export const authErrorKey = (error: unknown) => {
  const { code, status } = (error ?? {}) as { code?: string; status?: number };
  if (status === 429 || code === 'RATE_LIMITED') return 'rate-limited';
  if (code === 'INVALID_OTP') return 'invalid-code';
  if (code === 'OTP_EXPIRED') return 'expired-code';
  if (code === 'TOO_MANY_ATTEMPTS') return 'too-many-attempts';
  if (code === 'INVALID_EMAIL' || code === 'VALIDATION_ERROR') return 'invalid-email';
  return 'generic';
};
