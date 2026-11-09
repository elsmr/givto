import * as v from 'valibot';

// Shared building blocks for the document and input schemas. Client-safe: no server imports.
// Custom check messages are stable codes (snake_case) that the UI maps to localized text.

export const locales = ['en', 'nl'] as const;
export const Locale = v.picklist(locales);
export type Locale = v.InferOutput<typeof Locale>;

/** Every id we generate is a 24-char hex string (ObjectId hex), so user ids from Better Auth fit too. */
export const Id = v.pipe(v.string(), v.regex(/^[0-9a-f]{24}$/, 'invalid_id'));
export type Id = v.InferOutput<typeof Id>;

export const Email = v.pipe(v.string(), v.trim(), v.toLowerCase(), v.maxLength(254), v.email());

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;
const CONTROL_CHARS_EXCEPT_NEWLINE = /[\u0000-\u0009\u000b\u000c\u000e-\u001f\u007f]/;
// Mail clients auto-link anything that looks like a domain, so "evil.test" counts as a URL too.
const URL_LIKE = /:\/\/|www\.|[a-z0-9-]\.[a-z]{2,}\b/i;

/** One line of plain text: trimmed, no line breaks or control characters. */
export const SingleLine = (max: number) =>
  v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty('required'),
    v.maxLength(max),
    v.check((text) => !CONTROL_CHARS.test(text), 'no_line_breaks')
  );

/** Plain text that may span lines (rendered as text, never as HTML). */
export const MultiLine = (max: number) =>
  v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty('required'),
    v.maxLength(max),
    v.check((text) => !CONTROL_CHARS_EXCEPT_NEWLINE.test(text), 'no_control_chars')
  );

/**
 * Text that ends up in email subjects, sender names or bodies sent to other people
 * (abuse protection, 43): one line, no URLs, no `@`.
 */
export const EmailSafeText = (max: number) =>
  v.pipe(
    SingleLine(max),
    v.check((text) => !text.includes('@'), 'no_at_sign'),
    v.check((text) => !URL_LIKE.test(text), 'no_urls')
  );

export const PersonName = EmailSafeText(50);

export const HttpUrl = v.pipe(
  v.string(),
  v.trim(),
  v.maxLength(2000),
  v.url(),
  v.check((url) => /^https?:\/\//i.test(url), 'http_url_only')
);

/** Calendar date without a time zone: YYYY-MM-DD. */
export const LocalDate = v.pipe(v.string(), v.isoDate());
/** Wall-clock time without a time zone: HH:MM. */
export const LocalTime = v.pipe(v.string(), v.isoTime());

export const TimeZone = v.pipe(
  v.string(),
  v.maxLength(64),
  v.check((timeZone) => {
    try {
      new Intl.DateTimeFormat('en', { timeZone });
      return true;
    } catch {
      return false;
    }
  }, 'invalid_time_zone')
);

/** ISO 4217 code, e.g. EUR. */
export const Currency = v.pipe(v.string(), v.regex(/^[A-Z]{3}$/, 'invalid_currency'));

/** Amounts are integers in minor units (cents for EUR), so no float rounding. */
const Amount = v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(100_000_000));

/** A price or budget: one amount, or a range from `amount` to `maxAmount`. */
export const Price = v.pipe(
  v.object({
    currency: Currency,
    amount: Amount,
    maxAmount: v.optional(Amount),
  }),
  v.check(
    ({ amount, maxAmount }) => maxAmount === undefined || maxAmount >= amount,
    'invalid_price_range'
  )
);
export type Price = v.InferOutput<typeof Price>;
