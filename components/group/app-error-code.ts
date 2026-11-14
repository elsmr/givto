import { TRPCClientError } from '@trpc/client';
import type { AppErrorCode } from '@/lib/server/errors';

/** The server's `appCode` (lib/server/errors.ts), or INTERNAL for network and unknown errors. */
export const appErrorCode = (error: unknown): AppErrorCode =>
  (error instanceof TRPCClientError && typeof error.data?.appCode === 'string' && (error.data.appCode as AppErrorCode)) ||
  'INTERNAL';

/** The code when the caller has a message for it, otherwise INTERNAL (the generic message). */
export const knownAppError = <Code extends AppErrorCode>(error: unknown, known: readonly Code[]): Code | 'INTERNAL' => {
  const code = appErrorCode(error);
  return known.find((candidate) => candidate === code) ?? 'INTERNAL';
};
