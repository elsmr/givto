import type { Member } from '../../schema/member';
import type { Wish } from '../../schema/wish';
import type { Collections } from '../db';

/** What anyone may see of a wish. Never carries claims: the owner's outputs are built from this alone (38). */
export const toWishView = (wish: Wish) => ({
  id: wish._id,
  kind: wish.kind,
  title: wish.title,
  description: wish.description,
  url: wish.url,
  imageId: wish.imageId,
  price: wish.price,
  variant: wish.variant,
  reallyWant: wish.reallyWant,
});
export type WishView = ReturnType<typeof toWishView>;

/** Wishes of an account, or of a managed member (their wishes are owned by the member id). */
export const wishOwnerId = (member: Member): string | undefined =>
  member.userId ?? (member.managedBy ? member.id : undefined);

/** The current (not received) wishes of an owner, in the global order. */
export const listWishes = (db: Collections, ownerId: string, excludeIds: string[] = []) =>
  db.wishes
    .find({ ownerId, receivedAt: { $exists: false }, ...(excludeIds.length > 0 && { _id: { $nin: excludeIds } }) })
    .sort({ position: 1, _id: 1 })
    .toArray();

/** What this member's group sees of their wishlist: everything minus the wishes hidden in this group. */
export const visibleWishes = (db: Collections, member: Member) => {
  const ownerId = wishOwnerId(member);
  return ownerId ? listWishes(db, ownerId, member.wishlistView?.hiddenWishIds ?? []) : Promise.resolve([]);
};
