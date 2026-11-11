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

/** The current (not archived, not received) wishes of an owner, in the global order; only `onlyIds` when given. */
export const listWishes = (db: Collections, ownerId: string, onlyIds?: string[]) =>
  db.wishes
    .find({
      ownerId,
      archivedAt: { $exists: false },
      receivedAt: { $exists: false },
      ...(onlyIds && { _id: { $in: onlyIds } }),
    })
    .sort({ position: 1, _id: 1 })
    .toArray();

/**
 * What this member's group sees of their wishlist: the wishes shown in this group, in the group's order
 * (the order of `shownWishIds`). A managed member's wishes belong to this group alone, so they all show.
 */
export const visibleWishes = async (db: Collections, member: Member) => {
  const ownerId = wishOwnerId(member);
  if (!ownerId) return [];
  if (!member.userId) return listWishes(db, ownerId);
  const shownIds = member.wishlistView?.shownWishIds ?? [];
  const wishes = await listWishes(db, ownerId, shownIds);
  return wishes.toSorted((a, b) => shownIds.indexOf(a._id) - shownIds.indexOf(b._id));
};

/** My groups other than `exceptGroupId` that are active (not archived, latest edition not done), with what each shows of my wishes. */
export const activeGroupsOf = async (db: Collections, userId: string, exceptGroupId?: string) => {
  const groups = await db.groups
    .find({
      ...(exceptGroupId && { _id: { $ne: exceptGroupId } }),
      deletedAt: { $exists: false },
      archivedAt: { $exists: false },
      members: { $elemMatch: { userId, status: 'joined' } },
    })
    .toArray();
  const done = await db.editions
    .aggregate<{ _id: string }>([
      { $match: { groupId: { $in: groups.map((group) => group._id) } } },
      { $sort: { number: -1 } },
      { $group: { _id: '$groupId', status: { $first: '$status' } } },
      { $match: { status: 'done' } },
    ])
    .toArray();
  return groups
    .filter((group) => !done.some((edition) => edition._id === group._id))
    .map((group) => ({
      name: group.name,
      shownWishIds: group.members.find((m) => m.userId === userId && m.status === 'joined')?.wishlistView?.shownWishIds ?? [],
    }));
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
