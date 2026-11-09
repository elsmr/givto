import pino, { type DestinationStream, type Logger } from 'pino';
import { scrub } from '../scrub';

// Never log emails, codes, tokens, cookies or addresses (44). Structured fields are redacted
// by key; free text (error messages, library log lines) is scrubbed by pattern (lib/scrub.ts).
const SECRET_KEYS = [
  'email',
  'otp',
  'code',
  'token',
  'tokenHash',
  'url',
  'secret',
  'password',
  'cookie',
  'authorization',
  'address',
];
const REDACT_PATHS = [
  ...SECRET_KEYS,
  ...SECRET_KEYS.map((key) => `*.${key}`),
  'headers.cookie',
  'headers.authorization',
  'headers["set-cookie"]',
  '*.headers.cookie',
  '*.headers.authorization',
  '*.headers["set-cookie"]',
];

const serializeError = (error: Error) => {
  const serialized = pino.stdSerializers.err(error);
  return {
    ...serialized,
    message: scrub(serialized.message),
    stack: serialized.stack && scrub(serialized.stack),
  };
};

const isDev = process.env.NODE_ENV === 'development';

// pino-pretty as a plain stream (not a worker transport), which works inside Next's server bundle.
const destination = (): DestinationStream | undefined =>
  isDev
    ? (require('pino-pretty') as typeof import('pino-pretty')).build({
        colorize: true,
        ignore: 'pid,hostname',
      })
    : undefined;

/** The root logger. Inside a request use `ctx.log`, which carries the request id. */
export const log: Logger = pino(
  {
    level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
    base: undefined,
    redact: { paths: REDACT_PATHS, censor: '[redacted]' },
    serializers: { err: serializeError },
  },
  destination()
);
