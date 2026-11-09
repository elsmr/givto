import * as v from 'valibot';
import { Id, Locale, PersonName, SingleLine } from './common';

export const MemberRole = v.picklist(['organizer', 'member']);
export type MemberRole = v.InferOutput<typeof MemberRole>;

/**
 * invited: email invite sent, not accepted yet. requested: joined via the group link and
 * waits for the organizer's approval (45). joined: counts. declined / removed: kept so
 * history and draws stay readable.
 */
export const MemberStatus = v.picklist(['invited', 'requested', 'joined', 'declined', 'removed']);
export type MemberStatus = v.InferOutput<typeof MemberStatus>;

/** For posted exchanges (28): visible to this member's Santa only, after the draw; deleted after the event. */
export const PostalAddress = v.object({
  recipient: v.optional(SingleLine(100)),
  lines: v.pipe(v.array(SingleLine(100)), v.minLength(1), v.maxLength(3)),
  postalCode: SingleLine(20),
  city: SingleLine(100),
  region: v.optional(SingleLine(100)),
  /** ISO 3166-1 alpha-2, e.g. NL. */
  country: v.pipe(v.string(), v.regex(/^[A-Z]{2}$/, 'invalid_country')),
});
export type PostalAddress = v.InferOutput<typeof PostalAddress>;

/** Which of the member's own wishes this group sees (38): all wishes minus the hidden ones, in global order. */
export const WishlistView = v.object({
  /** When false, the wish slice hides a newly added wish in this group. */
  includeNewWishes: v.optional(v.boolean(), true),
  hiddenWishIds: v.optional(v.array(Id), []),
});
export type WishlistView = v.InferOutput<typeof WishlistView>;

/**
 * Embedded in `groups.members`. `id` is the member id used everywhere inside a group
 * (draw, exclusions, tips, claims); `userId` links the account.
 * Managed members (kids, grandparents) have no `userId` and a `managedBy` organizer, who
 * edits their wishlist (wishes with `ownerId` = this member id) and sees their draw result.
 * "Same again next year" keeps member ids, so a managed member's wishlist carries over.
 */
export const Member = v.object({
  id: Id,
  /** Absent for managed members and for email invitees who have no account yet. */
  userId: v.optional(Id),
  /** Member id of the organizer who manages this member. */
  managedBy: v.optional(Id),
  name: PersonName,
  role: MemberRole,
  /** The organizer may sit out of the draw. */
  participates: v.boolean(),
  status: MemberStatus,
  /** Email language for a member without an account; otherwise the account's locale wins. */
  locale: v.optional(Locale),
  invitedAt: v.optional(v.date()),
  /** Member id of the inviter. */
  invitedBy: v.optional(Id),
  joinedAt: v.optional(v.date()),
  removedAt: v.optional(v.date()),
  lastSeenAt: v.optional(v.date()),
  /** Last time this member, as a Santa, viewed their giftee's wishlist (35: skip stale notifications). */
  gifteeWishlistSeenAt: v.optional(v.date()),
  wishlistView: WishlistView,
  address: v.optional(PostalAddress),
});
export type Member = v.InferOutput<typeof Member>;
