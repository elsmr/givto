import { newId, type Collections } from '../db';
import { visibleWishes } from '../wishlist/wish-view';
import type { Member } from '../../schema/member';
import type { Wish } from '../../schema/wish';

const MINUTE = 60 * 1000;
/** No email while the giftee is still typing (35). */
export const WISHLIST_QUIET_MS = 45 * MINUTE;
/** Constant editing still sends, this long after the first pending change. */
export const WISHLIST_MAX_DELAY_MS = 24 * 60 * MINUTE;

export const toSnapshot = (wish: Wish) => ({
  wishId: wish._id,
  title: wish.title,
  ...(wish.description !== undefined && { description: wish.description }),
});

/** The baseline the first digest compares against: the wishlist the Santa saw at the draw. */
export const startWishlistSnapshot = async (db: Collections, editionId: string, giftee: Member) => {
  const snapshot = (await visibleWishes(db, giftee)).map(toSnapshot);
  await db.wishlistNotifications.updateOne(
    { editionId, gifteeMemberId: giftee.id },
    { $setOnInsert: { _id: newId(), snapshot, snapshotAt: new Date() } },
    { upsert: true }
  );
};

/**
 * Call after any change to a person's wishes or what a group sees of them: pushes the
 * pending digest's send time to the end of the quiet period, capped at the first change +
 * max delay. Only editions with a snapshot (drawn, see startWishlistSnapshot) are touched.
 */
export const markWishlistChanged = async (db: Collections, userId: string) => {
  const groups = await db.groups.find({ 'members.userId': userId }, { projection: { members: 1 } }).toArray();
  const memberIds = groups.flatMap((group) => group.members.filter((m) => m.userId === userId).map((m) => m.id));
  if (memberIds.length === 0) return;
  const now = new Date();
  await db.wishlistNotifications.updateMany({ gifteeMemberId: { $in: memberIds } }, [
    { $set: { firstChangeAt: { $ifNull: ['$firstChangeAt', now] }, lastChangeAt: now } },
    {
      $set: {
        notifyAfter: {
          $min: [new Date(now.getTime() + WISHLIST_QUIET_MS), { $add: ['$firstChangeAt', WISHLIST_MAX_DELAY_MS] }],
        },
      },
    },
  ]);
};

/** The Santa opened their giftee's wishlist: a pending digest about changes they've seen is skipped. */
export const markGifteeWishlistSeen = (db: Collections, editionId: string, santaMemberId: string) =>
  db.editions.updateOne(
    { _id: editionId, 'participants.memberId': santaMemberId },
    { $set: { 'participants.$.gifteeWishlistSeenAt': new Date() } }
  );
