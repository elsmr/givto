import { isDrawn } from '../schema/edition';
import type { Group } from '../schema/group';
import type { Collections } from './db';
import { takeOutOfDraw } from './draw/patch';
import { currentEdition, ownerOf } from './membership';

/**
 * Leaving (48) or being removed by the organizer (27): out of the current edition, its draw
 * patched so everyone left keeps a valid giftee; kept as `removed` so past editions stay readable. An invitee who
 * declines or lets the invite expire (98) goes the same way, as `declined`. A leaving organizer is a member again if
 * they ever rejoin (the member is reused), and the people they manage pass to the owner.
 */
export const removeMember = async (db: Collections, group: Group, memberId: string, status: 'removed' | 'declined' = 'removed') => {
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
    await db.guesses.deleteMany({
      editionId: edition._id,
      $or: [{ guesserMemberId: memberId }, { gifteeMemberId: memberId }, { santaMemberId: memberId }],
    });
  }
  await db.invites.deleteMany({ memberId, usedAt: { $exists: false } });
  const owner = ownerOf(group);
  await db.groups.updateOne(
    { _id: group._id, 'members.id': memberId },
    {
      $set: {
        'members.$.status': status,
        'members.$.role': 'member',
        ...(status === 'removed' && { 'members.$.removedAt': now }),
        households: group.households
          .map((h) => ({ ...h, memberIds: h.memberIds.filter((id) => id !== memberId) }))
          .filter((h) => h.memberIds.length >= 2),
        updatedAt: now,
      },
    }
  );
  if (owner && owner.id !== memberId) {
    await db.groups.updateOne(
      { _id: group._id },
      { $set: { 'members.$[m].managedBy': owner.id } },
      { arrayFilters: [{ 'm.managedBy': memberId }] }
    );
  }
};
