import { StandardSchemaV1Error, TRPCError } from '@trpc/server';
import type { TRPC_ERROR_CODE_KEY } from '@trpc/server/rpc';

/**
 * Error codes the UI turns into localized messages (44). Add a code here when a procedure
 * needs a new user-facing failure; the value is the tRPC (HTTP) code it maps to.
 * Not-a-member is reported as GROUP_NOT_FOUND so slugs don't reveal which groups exist.
 */
export const appErrorCodes = {
  INVALID_INPUT: 'BAD_REQUEST',
  UNAUTHENTICATED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'TOO_MANY_REQUESTS',
  GROUP_NOT_FOUND: 'NOT_FOUND',
  EDITION_NOT_FOUND: 'NOT_FOUND',
  NOT_ORGANIZER: 'FORBIDDEN',
  NOT_DRAWN: 'PRECONDITION_FAILED',
  NOT_SANTA: 'FORBIDDEN',
  INVALID_CODE: 'BAD_REQUEST',
  WISH_TAKEN: 'CONFLICT', WISHLIST_FULL: 'FORBIDDEN', IMPORT_BLOCKED: 'BAD_REQUEST', IMPORT_FAILED: 'UNPROCESSABLE_CONTENT',
  JOIN_LINK_INVALID: 'NOT_FOUND',
  INVITE_INVALID: 'NOT_FOUND',
  INVITE_EMAIL_MISMATCH: 'FORBIDDEN',
  GROUP_FULL: 'CONFLICT',
  ALREADY_MEMBER: 'CONFLICT',
  ALREADY_DRAWN: 'PRECONDITION_FAILED',
  ORGANIZER_CANNOT_LEAVE: 'FORBIDDEN',
  DRAW_IMPOSSIBLE: 'BAD_REQUEST',
  DATE_IN_PAST: 'BAD_REQUEST',
  EDITION_CLOSED: 'PRECONDITION_FAILED', WRONG_NUDGE_KIND: 'CONFLICT',
  TOO_FEW_PEOPLE: 'PRECONDITION_FAILED', EDITION_CHANGED: 'CONFLICT', DATES_OUT_OF_ORDER: 'BAD_REQUEST', EDITION_IN_PROGRESS: 'CONFLICT',
  INTERNAL: 'INTERNAL_SERVER_ERROR',
} as const satisfies Record<string, TRPC_ERROR_CODE_KEY>;
export type AppErrorCode = keyof typeof appErrorCodes;

/** `details` reach the client: never put emails, codes or other people's data in them. */
export class AppError extends TRPCError {
  readonly appCode: AppErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(appCode: AppErrorCode, options?: { details?: Record<string, unknown>; cause?: unknown }) {
    super({ code: appErrorCodes[appCode], message: appCode, cause: options?.cause });
    this.appCode = appCode;
    this.details = options?.details;
  }
}

const fromTRPCCode: Partial<Record<TRPC_ERROR_CODE_KEY, AppErrorCode>> = {
  BAD_REQUEST: 'INVALID_INPUT',
  PARSE_ERROR: 'INVALID_INPUT',
  UNAUTHORIZED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  TOO_MANY_REQUESTS: 'RATE_LIMITED',
};

export const toAppCode = (error: TRPCError): AppErrorCode =>
  error instanceof AppError ? error.appCode : (fromTRPCCode[error.code] ?? 'INTERNAL');

/** Unexpected errors are logged with their stack; the client only gets a generic message. */
export const isUnexpected = (error: TRPCError) => toAppCode(error) === 'INTERNAL';

export interface InputIssue {
  path: string;
  message: string;
}

/** Valibot issues as `{ path: 'giftDay.date', message: 'invalid_…' }`. */
const inputIssues = (error: TRPCError): InputIssue[] | undefined =>
  error.cause instanceof StandardSchemaV1Error
    ? error.cause.issues.map((issue) => ({
        path: (issue.path ?? [])
          .map((segment) => String(typeof segment === 'object' ? segment.key : segment))
          .join('.'),
        message: issue.message,
      }))
    : undefined;

/** The `data` every tRPC error response carries. */
export const errorData = (error: TRPCError, requestId: string | undefined) => ({
  appCode: toAppCode(error),
  requestId,
  issues: inputIssues(error),
  details: error instanceof AppError ? error.details : undefined,
});

export const GENERIC_ERROR_MESSAGE = 'Something went wrong';
