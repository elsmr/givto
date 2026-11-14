import { wishesOn, type Edition, type SavedWish } from '../../schema/edition';
import type { Group } from '../../schema/group';
import type { Member } from '../../schema/member';
import type { Wish } from '../../schema/wish';
import type { Collections } from '../db';
import { playerIds } from '../draw/rules';

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

/** A wish a done edition kept (100), in the same shape. */
export const savedWishView = ({ id, kind, title, description, links, price, variant, reallyWant }: SavedWish): WishView => ({
  id,
  kind,
  title,
  description,
  links,
  price,
  variant,
  reallyWant,
});

/** Wishes of an account, or of a managed member (their wishes are owned by the member id). */
export const wishOwnerId = (member: Member): string | undefined =>
  member.userId ?? (member.managedBy ? member.id : undefined);

/** Archived (76) or received: only in the owner's archive. */
export const inArchive = { $or: [{ archivedAt: { $exists: true } }, { receivedAt: { $exists: true } }] };

/**
 * The current (not archived, not received) wishes of an owner, in the global order; only `onlyIds` when given.
 * `receivedSince`: wishes received from then on count too.
 */
export const listWishes = (db: Collections, ownerId: string, onlyIds?: string[], receivedSince?: Date) =>
  db.wishes
    .find({
      ownerId,
      archivedAt: { $exists: false },
      ...(receivedSince
        ? { $or: [{ receivedAt: { $exists: false } }, { receivedAt: { $gte: receivedSince } }] }
        : { receivedAt: { $exists: false } }),
      ...(onlyIds && { _id: { $in: onlyIds } }),
    })
    .sort({ position: 1, _id: 1 })
    .toArray();

/**
 * What this member's group sees of their wishlist: the wishes shown in this group, in the group's order
 * (the order of `shownWishIds`). A managed member's wishes belong to this group alone, so they all show.
 */
export const visibleWishes = async (db: Collections, member: Member, receivedSince?: Date) => {
  const ownerId = wishOwnerId(member);
  if (!ownerId) return [];
  if (!member.userId) return listWishes(db, ownerId, undefined, receivedSince);
  const shownIds = member.wishlistView?.shownWishIds ?? [];
  const wishes = await listWishes(db, ownerId, shownIds, receivedSince);
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

// From the stored wish, not toWishView: the driver would store its undefined fields as null.
const toSavedWish = ({ _id, ownerId: _o, position: _p, receivedAt: _r, archivedAt: _a, createdAt: _c, updatedAt: _u, ...fields }: Wish): SavedWish => ({
  id: _id,
  ...fields,
  links: fields.links.map(({ imageId: _imageId, ...link }) => link),
});

/**
 * Keeps everyone's wishlist on the edition as it ends (100): what their group showed, plus what they marked received
 * since the draw, as it was on the list while the Santas shopped.
 */
export const saveWishlists = async (db: Collections, group: Group, edition: Edition) => {
  if (!wishesOn(edition)) return;
  const since = edition.statusChangedAt.drawn ?? edition.createdAt;
  const people = playerIds(group, edition).flatMap((id) => group.members.find((m) => m.id === id) ?? []);
  const wishlists = await Promise.all(
    people.map(async (member) => ({ memberId: member.id, wishes: (await visibleWishes(db, member, since)).map(toSavedWish) }))
  );
  await db.editions.updateOne({ _id: edition._id }, { $set: { wishlists } });
};
