import { TRPCClientError } from '@trpc/client';

/** The server's `appCode` (lib/server/errors.ts), or INTERNAL for network and unknown errors. */
export const appErrorCode = (error: unknown): string =>
  (error instanceof TRPCClientError && typeof error.data?.appCode === 'string' && error.data.appCode) ||
  'INTERNAL';

/** The code when the caller has a message for it, otherwise INTERNAL (the generic message). */
export const knownAppError = <Code extends string>(error: unknown, known: readonly Code[]): Code | 'INTERNAL' => {
  const code = appErrorCode(error);
  return known.find((candidate) => candidate === code) ?? 'INTERNAL';
};
