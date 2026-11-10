// Turns old (master) field values into values the v2 schemas accept, or null. Old production
// data had no validation at all, so every field is treated as unknown.
import { createHash } from 'node:crypto';
import { ObjectId } from 'mongodb';
import * as v from 'valibot';
import { Email, HttpUrl, MultiLine, PersonName, SingleLine } from '../../lib/schema/common';
import { GroupName, Slug } from '../../lib/schema/group';
import { cleanProductUrl } from '../../lib/server/import/clean-url';

/** Hex id of an ObjectId or a 24-char hex string (old code mixed both), else null. */
export const hexId = (id: unknown): string | null => {
  if (id instanceof ObjectId) return id.toHexString();
  return typeof id === 'string' && /^[0-9a-f]{24}$/i.test(id) ? id.toLowerCase() : null;
};

/** The same inputs always give the same id, so a re-run after a crash writes the same documents. */
export const derivedId = (...parts: string[]) => createHash('sha256').update(parts.join(':')).digest('hex').slice(0, 24);

export const derivedSlug = (groupId: string, attempt: number) =>
  createHash('sha256').update(`slug:${groupId}:${attempt}`).digest('base64url').slice(0, 12);

export const isSlug = (slug: unknown): slug is string => v.is(Slug, slug);

export const email = (raw: unknown): string | null => {
  const parsed = v.safeParse(Email, raw);
  return parsed.success ? parsed.output : null;
};

const oneLine = (raw: unknown, max: number) =>
  typeof raw === 'string' ? raw.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max).trim() : '';

const valid = <T extends v.GenericSchema<string, string>>(schema: T, text: string) =>
  v.is(schema, text) ? text : null;

export const personName = (raw: unknown) => valid(PersonName, oneLine(raw, 50));
export const groupName = (raw: unknown) => valid(GroupName, oneLine(raw, 80));
export const wishTitle = (raw: unknown) => valid(SingleLine(200), oneLine(raw, 200));

export const wishDescription = (raw: unknown) => {
  if (typeof raw !== 'string') return null;
  const text = raw
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ')
    .trim()
    .slice(0, 2000)
    .trim();
  return valid(MultiLine(2000), text);
};

/** master never wrote a wish `url`; production data is unvalidated, so one is kept if it's a valid link (tracking stripped, like imports). */
export const wishUrl = (raw: unknown) => {
  const parsed = v.safeParse(HttpUrl, raw);
  return parsed.success ? valid(HttpUrl, cleanProductUrl(parsed.output)) : null;
};

/** Dedupe key for wishes: case, width and spacing don't make a different wish. */
export const titleKey = (title: string) => title.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Old code wrote `Date.now()` (ms). Also accepts Dates, seconds and date strings; anything before
 * 2000 or after `now` is null, so the caller falls back to the ObjectId's creation time.
 */
export const timestamp = (raw: unknown, now: Date): Date | null => {
  const numeric = typeof raw === 'string' && /^\d+$/.test(raw.trim()) ? Number(raw) : raw;
  const date =
    raw instanceof Date
      ? raw
      : typeof numeric === 'number'
        ? new Date(numeric < 1e11 ? numeric * 1000 : numeric)
        : typeof raw === 'string'
          ? new Date(raw)
          : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  return date.getUTCFullYear() >= 2000 && date <= now ? date : null;
};

/** `ann@example.com` → `a***@example.com`: reports go to terminals and tickets. */
export const maskEmail = (raw: unknown) => {
  const text = String(raw ?? '');
  const at = text.lastIndexOf('@');
  return at < 1 ? `${text.slice(0, 1)}***` : `${text.slice(0, 1)}***${text.slice(at)}`;
};
