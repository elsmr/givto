import { ObjectId } from 'mongodb';
import type { Group } from '../../schema/group';
import type { Member } from '../../schema/member';
import { deletePendingSignIns } from '../auth';
import { getMongoDb, type Collections } from '../db';

// Shown to the others in place of the person's name; draws keep pointing at the member.
const removedName = { en: 'Deleted account', nl: 'Verwijderd account' } as const;

const anonymized = (member: Member, group: Group, now: Date): Member => ({
  id: member.id,
  name: removedName[group.locale],
  role: 'member',
  status: 'removed',
  removedAt: now,
  wishlistView: { includeNewWishes: true, hiddenWishIds: [] },
});

/**
 * The group without this person: their member anonymized and removed, the organizer role
 * (and the members they manage) passed to the longest-joined member with an account.
 * Null when nobody else with an account has joined: then the group goes.
 */
export const groupWithout = (group: Group, userId: string, now: Date): Group | null => {
  const me = group.members.find((member) => member.userId === userId)!;
  const others = group.members
    .filter((member) => member.userId && member.userId !== userId && member.status === 'joined')
    .toSorted((a, b) => (a.joinedAt?.getTime() ?? Infinity) - (b.joinedAt?.getTime() ?? Infinity));
  if (others.length === 0) return null;
  const successor = me.role === 'organizer' ? others[0] : undefined;
  const members = group.members.map((member): Member => {
    if (member.id === me.id) return anonymized(member, group, now);
    if (member.id === successor?.id) return { ...member, role: 'organizer' };
    if (successor && member.managedBy === me.id) return { ...member, managedBy: successor.id };
    return member;
  });
  const organizer = members.find((member) => member.role === 'organizer' && member.userId);
  return {
    ...group,
    members,
    createdBy: group.createdBy === userId && organizer?.userId ? organizer.userId : group.createdBy,
    ...(successor && { organizerHandover: { toMemberId: successor.id, at: now } }),
    updatedAt: now,
  };
};

/** Deletes a group and everything in its editions. */
export const deleteGroup = async (db: Collections, group: Group) => {
  const editionIds = (await db.editions.find({ groupId: group._id }, { projection: { _id: 1 } }).toArray()).map(
    (edition) => edition._id
  );
  const inEditions = { editionId: { $in: editionIds } };
  const managedIds = group.members.filter((member) => !member.userId).map((member) => member.id);
  await Promise.all([
    db.claims.deleteMany(inEditions),
    db.gifts.deleteMany(inEditions),
    db.guesses.deleteMany(inEditions),
    db.tips.deleteMany(inEditions),
    db.questions.deleteMany(inEditions),
    db.nudges.deleteMany(inEditions),
    db.wishlistNotifications.deleteMany(inEditions),
    db.sentNotifications.deleteMany({ $or: [inEditions, { groupId: group._id }] }),
    db.invites.deleteMany({ groupId: group._id }),
    db.wishes.deleteMany({ ownerId: { $in: managedIds } }),
  ]);
  await db.editions.deleteMany({ groupId: group._id });
  await db.groups.deleteOne({ _id: group._id });
};

/**
 * Account deletion (55). Person-keyed data first, groups next, the account last, so a
 * failed run can be retried: the user and their memberships are still found.
 */
export const deleteAccount = async (db: Collections, user: { id: string; email: string }) => {
  const now = new Date();
  const groups = await db.groups.find({ 'members.userId': user.id }).toArray();
  const memberIds = groups.flatMap((group) =>
    group.members.filter((member) => member.userId === user.id).map((member) => member.id)
  );
  const mine = { $in: memberIds };
  const wishIds = (await db.wishes.find({ ownerId: user.id }, { projection: { _id: 1 } }).toArray()).map(
    (wish) => wish._id
  );

  await Promise.all([
    db.claims.deleteMany({ $or: [{ wishId: { $in: wishIds } }, { santaMemberId: mine }] }),
    db.gifts.deleteMany({ $or: [{ santaMemberId: mine }, { gifteeMemberId: mine }] }),
    db.guesses.deleteMany({ $or: [{ guesserMemberId: mine }, { guessedMemberId: mine }] }),
    db.tips.deleteMany({ $or: [{ authorMemberId: mine }, { aboutMemberId: mine }] }),
    db.questions.deleteMany({ $or: [{ askerMemberId: mine }, { gifteeMemberId: mine }] }),
    db.nudges.deleteMany({ $or: [{ santaMemberId: mine }, { gifteeMemberId: mine }] }),
    db.wishlistNotifications.deleteMany({ gifteeMemberId: mine }),
    db.sentNotifications.deleteMany({ $or: [{ userId: user.id }, { memberId: mine }] }),
    db.invites.deleteMany({ $or: [{ email: user.email }, { memberId: mine }] }),
    db.emailSuppressions.deleteOne({ _id: user.email.toLowerCase() }),
    db.editions.updateMany(
      { 'participants.memberId': mine },
      { $unset: { 'participants.$[p].address': '', 'participants.$[p].gifteeWishlistSeenAt': '' } },
      { arrayFilters: [{ 'p.memberId': mine }] }
    ),
  ]);
  await db.wishes.deleteMany({ ownerId: user.id });

  for (const group of groups) {
    const next = groupWithout(group, user.id, now);
    if (next) await db.groups.replaceOne({ _id: group._id }, next);
    else await deleteGroup(db, group);
  }

  const raw = getMongoDb();
  const userId = new ObjectId(user.id);
  await deletePendingSignIns(user.email);
  await Promise.all(
    ['sessions', 'accounts', 'passkeys'].map((name) => raw.collection(name).deleteMany({ userId }))
  );
  await db.users.deleteOne({ _id: userId });
};
