import { isBeforeDraw, isFromGiftDay, type Edition } from '../schema/edition';
import type { Group } from '../schema/group';
import type { Collections } from './db';
import { takeOutOfDraw } from './draw/patch';
import { currentEdition, ownerOf } from './membership';

/**
 * Out of the group's current edition, unless it's over. Before gift day the draw is patched so everyone left keeps
 * a giftee (`refuse`: the organizer's Remove fails instead when no draw works without them). Someone who `left` after
 * the draw stays listed as declined, so coming back doesn't put them in this draw again (105). From gift day on the
 * draw is history: nobody gets a new giftee and what was bought and guessed stays; they only drop out of the unwrapping.
 */
export const leaveEdition = async (
  db: Collections,
  groupId: string,
  edition: Edition,
  memberId: string,
  { left = false, refuse = false } = {}
) => {
  if (edition.status === 'done') return;
  await takeOutOfDraw(db, groupId, edition._id, memberId, { refuse });
  const updatedAt = new Date();
  if (left && !isBeforeDraw(edition)) {
    await db.editions.updateOne(
      { _id: edition._id, 'participants.memberId': memberId },
      { $set: { 'participants.$.status': 'declined', 'participants.$.participates': false, updatedAt } }
    );
  } else {
    await db.editions.updateOne({ _id: edition._id }, { $pull: { participants: { memberId } }, $set: { updatedAt } });
  }
  if (isFromGiftDay(edition)) return;
  await db.claims.deleteMany({ editionId: edition._id, santaMemberId: memberId });
  await db.gifts.deleteMany({ editionId: edition._id, $or: [{ santaMemberId: memberId }, { gifteeMemberId: memberId }] });
  await db.guesses.deleteMany({
    editionId: edition._id,
    $or: [{ guesserMemberId: memberId }, { gifteeMemberId: memberId }, { santaMemberId: memberId }],
  });
};

/**
 * Leaving (48), being removed by the organizer (27), or an invitee who declines or lets the invite expire (98,
 * `declined`): out of the current edition (`leaveEdition`), kept in the group as `removed` / `declined` so past
 * editions stay readable. Only someone who `left` may come back through the join link (105). A leaving organizer is
 * a member again if they ever rejoin (the member is reused), and the people they manage pass to the owner.
 */
export const removeMember = async (db: Collections, group: Group, memberId: string, how: 'removed' | 'left' | 'declined' = 'removed') => {
  const now = new Date();
  const edition = await currentEdition(db, group._id);
  if (edition) await leaveEdition(db, group._id, edition, memberId, { left: how === 'left', refuse: how === 'removed' });
  await db.invites.deleteMany({ memberId, usedAt: { $exists: false } });
  const owner = ownerOf(group);
  await db.groups.updateOne(
    { _id: group._id, 'members.id': memberId },
    {
      $set: {
        'members.$.status': how === 'declined' ? 'declined' : 'removed',
        'members.$.role': 'member',
        ...(how !== 'declined' && { 'members.$.removedAt': now }),
        ...(how === 'left' && { 'members.$.leftAt': now }),
        households: group.households
          .map((h) => ({ ...h, memberIds: h.memberIds.filter((id) => id !== memberId) }))
          .filter((h) => h.memberIds.length >= 2),
        updatedAt: now,
      },
      ...(how === 'removed' && { $unset: { 'members.$.leftAt': true as const } }),
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
