import type { Locale } from '../../lib/schema/common';

/** A local date (YYYY-MM-DD, no time zone) as "Friday 18 December 2026" in the recipient's language. */
export const formatLocalDate = (date: string, locale: Locale): string =>
  new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
