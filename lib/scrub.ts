// Free text (error messages, stack traces, library log lines) can carry emails, codes or tokens.
// Shared by the server log (lib/server/log.ts) and Sentry events (lib/sentry-options.ts).
const PATTERNS: [RegExp, string][] = [
  // Domain must end in letters, so `mongodb@7.8.0/…` in stack paths isn't mistaken for an email.
  [/[^\s@<>"'(),;:/]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}\b/gi, '[email]'],
  [/([?&](?:token|otp|code|callbackURL)=)[^&\s"']*/gi, '$1[redacted]'],
  [/\b\d{6}\b/g, '[code]'],
];

export const scrub = (text: string): string =>
  PATTERNS.reduce((result, [pattern, replacement]) => result.replace(pattern, replacement), text);
