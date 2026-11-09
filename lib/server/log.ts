import pino, { type DestinationStream, type Logger } from 'pino';

// Never log emails, codes, tokens, cookies or addresses (44). Structured fields are redacted
// by key; free text (error messages, library log lines) is scrubbed by pattern.
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

const PATTERNS: [RegExp, string][] = [
  // Domain must end in letters, so `mongodb@7.8.0/…` in stack paths isn't mistaken for an email.
  [/[^\s@<>"'(),;:/]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}\b/gi, '[email]'],
  [/([?&](?:token|otp|code|callbackURL)=)[^&\s"']*/gi, '$1[redacted]'],
  [/\b\d{6}\b/g, '[code]'],
];

export const scrub = (text: string): string =>
  PATTERNS.reduce((result, [pattern, replacement]) => result.replace(pattern, replacement), text);

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
