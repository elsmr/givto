import * as v from 'valibot';
import { EmailSafeText, Id, Locale, SingleLine, TimeZone } from './common';
import { Member } from './member';

export const MIN_PARTICIPANTS = 3;
export const MAX_MEMBERS = 100;

export const Slug = v.pipe(v.string(), v.regex(/^[A-Za-z0-9_-]{6,32}$/, 'invalid_slug'));

export const GroupName = EmailSafeText(80);

export const ExchangeMode = v.picklist(['inPerson', 'byPost', 'both']);
export type ExchangeMode = v.InferOutput<typeof ExchangeMode>;

/** A keep-apart row (26): nobody gives to someone in a row they're in. A person can be in several. */
export const Household = v.object({
  id: Id,
  name: v.optional(SingleLine(50)),
  memberIds: v.pipe(v.array(Id), v.minLength(2), v.maxLength(MAX_MEMBERS)),
});
export type Household = v.InferOutput<typeof Household>;

/**
 * Shareable join link (45): multi-use, revocable and regenerable (new token).
 * Joining adds the person to the group and to the open edition.
 */
export const JoinLink = v.object({
  token: v.pipe(v.string(), v.regex(/^[A-Za-z0-9_-]{16,64}$/, 'invalid_token')),
  revoked: v.boolean(),
  requiresApproval: v.boolean(),
  maxMembers: v.optional(v.pipe(v.number(), v.integer(), v.minValue(MIN_PARTICIPANTS), v.maxValue(MAX_MEMBERS))),
  expiresAt: v.optional(v.date()),
  createdAt: v.date(),
});
export type JoinLink = v.InferOutput<typeof JoinLink>;

/** Fields the organizer edits. */
export const GroupFields = v.object({
  name: GroupName,
  /** Email language for people without an account; defaults to the organizer's. */
  locale: Locale,
  /** Gift day, reminders and scheduled draws follow it; edition dates are local dates here. */
  timeZone: TimeZone,
});
export type GroupFields = v.InferOutput<typeof GroupFields>;

/**
 * `groups` collection: the persistent people (members embedded: small, atomic updates),
 * join link and standing keep-apart rows. Each Secret Santa is an edition (`editions`
 * collection), which starts from the previous one's settings; the group itself has no
 * lifecycle, only archived/deleted.
 */
export const Group = v.object({
  _id: Id,
  slug: Slug,
  ...GroupFields.entries,
  /** User id of the creator. */
  createdBy: Id,
  members: v.pipe(v.array(Member), v.maxLength(MAX_MEMBERS)),
  /** Standing keep-apart rows, applied to every edition's draw. */
  households: v.array(Household),
  joinLink: v.optional(JoinLink),
  /** Set when the organizer deleted their account and the role passed to `toMemberId` (55); the notice email sets `notifiedAt`. */
  organizerHandover: v.optional(v.object({ toMemberId: Id, at: v.date(), notifiedAt: v.optional(v.date()) })),
  createdAt: v.date(),
  updatedAt: v.date(),
  archivedAt: v.optional(v.date()),
  deletedAt: v.optional(v.date()),
});
export type Group = v.InferOutput<typeof Group>;
