// The retention job (55) uses these values, so /privacy matches what we do.
export const privacyContact = {
  controller: 'Elias Meire',
  email: 'elias@meire.dev',
};

export const retention = {
  /** Same as SIGN_IN_EXPIRES_IN and the session expiry in lib/server/auth.ts. */
  signInCodeMinutes: 10,
  sessionDays: 30,
  /** Claims, tips, questions and nudges, counted from gift day. */
  editionMessagesMonths: 3,
  /** The draw stays until the next edition is drawn (avoid last year's pairs), at most this long. */
  drawMaxMonths: 24,
  /** Groups without edition activity; deleted after an email warning. */
  inactiveGroupMonths: 24,
  errorReportDays: 90,
};

export const privacyUpdatedOn = '2026-11-09';
