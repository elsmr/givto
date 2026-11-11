import * as v from 'valibot';
import { Id, Locale, PersonName } from './common';
import { AvatarColor } from './user';

export const MemberRole = v.picklist(['organizer', 'member']);
export type MemberRole = v.InferOutput<typeof MemberRole>;

/**
 * invited: email invite sent, not accepted yet. requested: joined via the group link and
 * waits for the organizer's approval (45). joined: counts. declined / removed: kept so
 * past editions stay readable.
 */
export const MemberStatus = v.picklist(['invited', 'requested', 'joined', 'declined', 'removed']);
export type MemberStatus = v.InferOutput<typeof MemberStatus>;

/** Which of the member's own wishes this group sees (38): only the ones shown here, in global order. New wishes show nowhere unless picked. */
export const WishlistView = v.object({
  shownWishIds: v.array(Id),
});
export type WishlistView = v.InferOutput<typeof WishlistView>;

/**
 * Embedded in `groups.members`: the persistent people of a group. `id` is the member id
 * used everywhere (editions, draws, exclusions, tips, claims) and stays the same across
 * editions; `userId` links the account.
 * Managed members (kids, grandparents) have no `userId` and a `managedBy` organizer, who
 * edits their wishlist (wishes with `ownerId` = this member id) and sees their draw result.
 */
export const Member = v.object({
  id: Id,
  /** Absent for managed members and for email invitees who have no account yet. */
  userId: v.optional(Id),
  /** Member id of the organizer who manages this member. */
  managedBy: v.optional(Id),
  /** With a `userId`, copies of the account's, kept in sync by `account.setName` / `setAvatarColor`. */
  name: PersonName,
  avatarColor: v.optional(AvatarColor),
  role: MemberRole,
  status: MemberStatus,
  /** Email language for a member without an account; otherwise the account's locale wins. */
  locale: v.optional(Locale),
  invitedAt: v.optional(v.date()),
  /** Member id of the inviter. */
  invitedBy: v.optional(Id),
  joinedAt: v.optional(v.date()),
  removedAt: v.optional(v.date()),
  lastSeenAt: v.optional(v.date()),
  wishlistView: WishlistView,
  /** The address from the account's address book that this group's Santas post to (80); absent or removed = the default. */
  addressId: v.optional(Id),
});
export type Member = v.InferOutput<typeof Member>;
