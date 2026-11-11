// The retention job (55) uses these values, so /privacy matches what we do.
export const privacyContact = {
  controller: 'Elias Meire',
  email: 'elias@meire.dev',
};

export const retention = {
  /** Same as SIGN_IN_EXPIRES_IN in lib/server/auth.ts. */
  signInCodeMinutes: 10,
  /** The session expiry in lib/server/auth.ts reads this. */
  sessionDays: 60,
  /** Claims, gifts marked, guesses, votes, tips, questions and nudges, counted from gift day. */
  editionMessagesMonths: 3,
  /** The draw stays until the next edition is drawn (avoid last year's pairs), at most this long. */
  drawMaxMonths: 24,
  /** Groups without edition activity; deleted after an email warning. */
  inactiveGroupMonths: 24,
  /** Sentry keeps errors 30 days on the free Developer plan; paid plans keep them 90. Raise this when upgrading. */
  errorReportDays: 30,
  /** Which email went to whom (`sentNotifications`): the TTL index in lib/server/db.ts. Changing it on an existing database needs a collMod. */
  sentEmailsDays: 400,
};

export const privacyUpdatedOn = '2026-11-11';
