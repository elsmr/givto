import { isDrawn } from '../schema/edition';
import type { Group } from '../schema/group';
import type { Collections } from './db';
import { takeOutOfDraw } from './draw/patch';
import { currentEdition } from './membership';

/**
 * Leaving (48) or being removed by the organizer (27): out of the current edition, its draw
 * patched so everyone left keeps a valid giftee; kept as `removed` so past editions stay readable.
 */
export const removeMember = async (db: Collections, group: Group, memberId: string) => {
  const now = new Date();
  const edition = await currentEdition(db, group._id);
  if (edition && isDrawn(edition)) await takeOutOfDraw(db, group._id, edition._id, memberId);
  if (edition && edition.status !== 'done') {
    await db.editions.updateOne(
      { _id: edition._id },
      { $pull: { participants: { memberId } }, $set: { updatedAt: now } }
    );
    await db.claims.deleteMany({ editionId: edition._id, santaMemberId: memberId });
    await db.gifts.deleteMany({ editionId: edition._id, $or: [{ santaMemberId: memberId }, { gifteeMemberId: memberId }] });
    // Their guess, and guesses naming them: those people may guess again (it hints nothing about who's right).
    await db.guesses.deleteMany({ editionId: edition._id, $or: [{ guesserMemberId: memberId }, { guessedMemberId: memberId }] });
    // Rows naming them on the other boards (82) go; the rest of those boards stays.
    await db.guesses.updateMany(
      { editionId: edition._id },
      { $pull: { pairs: { $or: [{ gifteeMemberId: memberId }, { santaMemberId: memberId }] } } }
    );
  }
  await db.invites.deleteMany({ memberId, usedAt: { $exists: false } });
  await db.groups.updateOne(
    { _id: group._id, 'members.id': memberId },
    {
      $set: {
        'members.$.status': 'removed',
        'members.$.removedAt': now,
        households: group.households
          .map((h) => ({ ...h, memberIds: h.memberIds.filter((id) => id !== memberId) }))
          .filter((h) => h.memberIds.length >= 2),
        exclusions: group.exclusions.filter((e) => e.from !== memberId && e.to !== memberId),
        updatedAt: now,
      },
    }
  );
};
