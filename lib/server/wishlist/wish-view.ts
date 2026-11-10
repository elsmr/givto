import type { Member } from '../../schema/member';
import type { Wish } from '../../schema/wish';
import type { Collections } from '../db';

/** What anyone may see of a wish. Never carries claims: the owner's outputs are built from this alone (38). */
export const toWishView = (wish: Wish) => ({
  id: wish._id,
  kind: wish.kind,
  title: wish.title,
  description: wish.description,
  links: wish.links,
  price: wish.price,
  variant: wish.variant,
  reallyWant: wish.reallyWant,
});
export type WishView = ReturnType<typeof toWishView>;

/** Wishes of an account, or of a managed member (their wishes are owned by the member id). */
export const wishOwnerId = (member: Member): string | undefined =>
  member.userId ?? (member.managedBy ? member.id : undefined);

/** Archived (76) or received: only in the owner's archive. */
export const inArchive = { $or: [{ archivedAt: { $exists: true } }, { receivedAt: { $exists: true } }] };

/** The current (not archived, not received) wishes of an owner, in the global order. */
export const listWishes = (db: Collections, ownerId: string, excludeIds: string[] = []) =>
  db.wishes
    .find({
      ownerId,
      archivedAt: { $exists: false },
      receivedAt: { $exists: false },
      ...(excludeIds.length > 0 && { _id: { $nin: excludeIds } }),
    })
    .sort({ position: 1, _id: 1 })
    .toArray();

/** What this member's group sees of their wishlist: everything minus the wishes hidden in this group. */
export const visibleWishes = (db: Collections, member: Member) => {
  const ownerId = wishOwnerId(member);
  return ownerId ? listWishes(db, ownerId, member.wishlistView?.hiddenWishIds ?? []) : Promise.resolve([]);
};

/**
 * What a Santa sees of their giftee's list: the group's view, plus archived wishes this Santa has
 * Dibs! on in this edition (76), flagged, since they may have bought them already.
 */
export const santaWishes = async (db: Collections, giftee: Member, editionId: string, santaMemberId: string) => {
  const ownerId = wishOwnerId(giftee);
  if (!ownerId) return [];
  const [visible, claims] = await Promise.all([
    visibleWishes(db, giftee),
    db.claims.find({ ownerId, editionId, santaMemberId }, { projection: { wishId: 1 } }).toArray(),
  ]);
  const archived = await db.wishes
    .find({ _id: { $in: claims.map((claim) => claim.wishId) }, ownerId, ...inArchive })
    .sort({ position: 1, _id: 1 })
    .toArray();
  return [...visible.map((wish) => ({ ...wish, archived: false })), ...archived.map((wish) => ({ ...wish, archived: true }))];
};
