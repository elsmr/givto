import { ObjectId } from 'mongodb';
import { getMongoDb, type Collections } from '../db';

/**
 * Everything stored about one person (55), as JSON. Leaves out what they may not see
 * (claims, gifts, tips and guesses about them, who their Santa is, who sent a nudge or question) and
 * other people's data (the draw, other members).
 */
export const exportAccount = async (db: Collections, userId: string) => {
  const userObjectId = new ObjectId(userId);
  const [user, groups] = await Promise.all([
    db.users.findOne({ _id: userObjectId }),
    db.groups.find({ 'members.userId': userId }).toArray(),
  ]);
  if (!user) return null;
  const memberships = groups.map((group) => ({
    group,
    member: group.members.find((member) => member.userId === userId)!,
  }));
  const memberIds = memberships.map(({ member }) => member.id);
  const slugOf = new Map(groups.map((group) => [group._id, group.slug]));
  const nameOf = (memberId: string) => groups.flatMap((group) => group.members).find((member) => member.id === memberId)?.name;
  const mine = { $in: memberIds };
  const raw = getMongoDb();

  const [editions, wishes, claims, gifts, guesses, tips, asked, received, nudgesSent, nudgesReceived, notifications, invites, sessions, passkeys] =
    await Promise.all([
      db.editions.find({ 'participants.memberId': mine }).toArray(),
      db.wishes.find({ ownerId: userId }).sort({ position: 1 }).toArray(),
      db.claims.find({ santaMemberId: mine }).toArray(),
      db.gifts.find({ santaMemberId: mine }).toArray(),
      db.guesses.find({ guesserMemberId: mine }).toArray(),
      db.tips.find({ authorMemberId: mine }).toArray(),
      db.questions.find({ askerMemberId: mine }).toArray(),
      db.questions.find({ gifteeMemberId: mine }).toArray(),
      db.nudges.find({ santaMemberId: mine }).toArray(),
      db.nudges.find({ gifteeMemberId: mine }).toArray(),
      db.sentNotifications.find({ $or: [{ userId }, { memberId: mine }] }).toArray(),
      db.invites.find({ $or: [{ email: user.email }, { memberId: mine }] }).toArray(),
      raw.collection('sessions').find({ userId: userObjectId }).toArray(),
      raw.collection('passkeys').find({ userId: userObjectId }).toArray(),
    ]);

  return {
    exportedAt: new Date(),
    account: {
      name: user.name,
      email: user.email,
      locale: user.locale,
      notifications: user.notifications ?? {},
      avatarColor: user.avatarColor,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    sessions: sessions.map(({ createdAt, expiresAt, ipAddress, userAgent }) => ({ createdAt, expiresAt, ipAddress, userAgent })),
    passkeys: passkeys.map(({ name, deviceType, backedUp, createdAt }) => ({ name, deviceType, backedUp, createdAt })),
    groups: memberships.map(({ group, member }) => ({
      name: group.name,
      slug: group.slug,
      role: member.role,
      status: member.status,
      invitedAt: member.invitedAt,
      joinedAt: member.joinedAt,
      removedAt: member.removedAt,
      shownWishIds: member.wishlistView.shownWishIds,
    })),
    editions: editions.map((edition) => ({
      group: slugOf.get(edition.groupId),
      number: edition.number,
      title: edition.title,
      year: edition.year,
      status: edition.status,
      participation: edition.participants
        .filter((participant) => memberIds.includes(participant.memberId))
        .map(({ memberId: _memberId, ...participant }) => participant),
    })),
    wishes: wishes.map(({ ownerId: _ownerId, ...wish }) => wish),
    claims: claims.map(({ wishId, editionId, createdAt }) => ({ wishId, editionId, createdAt })),
    guessesMade: guesses.map(({ editionId, guessedMemberId, createdAt }) => ({ editionId, guessed: nameOf(guessedMemberId), createdAt })),
    giftsMarked: gifts.map(({ editionId, wishIds, lines, createdAt, updatedAt }) => ({ editionId, wishIds, lines, createdAt, updatedAt })),
    tipsWritten: tips.map(({ text, anonymous, createdAt, updatedAt }) => ({ text, anonymous, createdAt, updatedAt })),
    questionsAsked: asked.map(({ text, answer, createdAt }) => ({ text, answer: answer?.text, createdAt })),
    questionsReceived: received.map(({ text, answer, createdAt }) => ({ text, answer: answer?.text, createdAt })),
    nudgesSent: nudgesSent.map(({ kind, createdAt, sentAt }) => ({ kind, createdAt, sentAt })),
    nudgesReceived: nudgesReceived.filter((nudge) => nudge.sentAt).map(({ kind, sentAt }) => ({ kind, sentAt })),
    emailsSent: notifications.map(({ kind, sentAt }) => ({ kind, sentAt })),
    invites: invites.map(({ groupId, createdAt, expiresAt, usedAt }) => ({ group: slugOf.get(groupId), createdAt, expiresAt, usedAt })),
  };
};
