import { TRPCClientError } from '@trpc/client';
import { appErrorCode, knownAppError } from '../group/app-error-code';

const knownErrors = [
  'DATE_IN_PAST',
  'DATES_OUT_OF_ORDER',
  'INVALID_INPUT',
  'ALREADY_DRAWN',
  'EDITION_CLOSED',
  'EDITION_CHANGED',
  'ORGANIZER_CANNOT_LEAVE',
] as const;

/** Key under `settings.errors`. The schema's date-order check and "not the same as last year" get their own message. */
export const settingsErrorKey = (error: unknown) => {
  const issues: { message: string }[] = (error instanceof TRPCClientError && error.data?.issues) || [];
  if (issues.some((issue) => issue.message === 'dates_out_of_order')) return 'DATES_OUT_OF_ORDER';
  if (appErrorCode(error) === 'DRAW_IMPOSSIBLE') return 'AVOID_PREVIOUS';
  return knownAppError(error, knownErrors);
};
