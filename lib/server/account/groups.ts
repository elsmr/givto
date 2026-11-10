import { daysBetween, todayIn } from '../../local-date';
import { isDrawn, type Edition } from '../../schema/edition';
import { MIN_PARTICIPANTS } from '../../schema/group';
import { ownAndManagedIds } from '../between/santa-role';
import type { Collections } from '../db';
import { listWishes } from '../wishlist/wish-view';

// Wishes nobody gave stay unreceived on purpose, so the reminder to tick off gifts has to end.
const MARK_RECEIVED_DAYS = 14;

/** The dashboard: groups I've joined, each with its latest edition and my to-dos there. */
export const accountGroups = async (db: Collections, userId: string) => {
  const groups = await db.groups
    .find({ deletedAt: { $exists: false }, members: { $elemMatch: { userId, status: 'joined' } } })
    .toArray();
  const [editions, wishes] = await Promise.all([
    db.editions
      .aggregate<{ _id: string; edition: Edition }>([
        { $match: { groupId: { $in: groups.map((group) => group._id) } } },
        { $sort: { number: -1 } },
        { $group: { _id: '$groupId', edition: { $first: '$$ROOT' } } },
      ])
      .toArray(),
    listWishes(db, userId),
  ]);
  const latest = new Map(editions.map(({ _id, edition }) => [_id, edition]));
  const memberOf = (group: (typeof groups)[number]) => group.members.find((m) => m.userId === userId)!;
  const ownIdsByGroup = new Map(groups.map((group) => [group._id, ownAndManagedIds(group, memberOf(group))]));
  const myGiftees = editions.flatMap(({ _id, edition }) => {
    const santaId = memberOf(groups.find((group) => group._id === _id)!).id;
    const gifteeId = edition.status === 'drawn' && edition.draw?.assignments[santaId];
    return gifteeId ? [{ editionId: edition._id, santaMemberId: santaId, gifteeMemberId: gifteeId }] : [];
  });
  // "I've got my gift" (63): the Santas among my editions who marked one for their current giftee.
  const gifted = myGiftees.length === 0 ? [] : await db.gifts.find({ $or: myGiftees }, { projection: { editionId: 1 } }).toArray();
  const questionEditions = editions.filter(({ edition }) => isDrawn(edition));
  // Same filter as question.forMe (delivered only), narrowed to unanswered.
  const questions =
    questionEditions.length === 0
      ? []
      : await db.questions
        .find(
          {
            editionId: { $in: questionEditions.map(({ edition }) => edition._id) },
            gifteeMemberId: { $in: questionEditions.flatMap(({ _id }) => ownIdsByGroup.get(_id) ?? []) },
            notifyAfter: { $lte: new Date() },
            answer: { $exists: false },
          },
          { projection: { editionId: 1, askerMemberId: 1 } }
        )
        .toArray();
  return groups.map((group) => {
    const member = memberOf(group);
    const edition = latest.get(group._id);
    const isOrganizer = member.role === 'organizer';
    const participantCount =
      edition?.participants.filter((p) => p.participates && p.status === 'joined').length ?? 0;
    const ownIds = ownIdsByGroup.get(group._id) ?? [];
    const unanswered = questions.filter(
      (q) => q.editionId === edition?._id && !ownIds.includes(q.askerMemberId)
    ).length;
    const shown = new Set(member.wishlistView?.shownWishIds ?? []);
    const visibleWishCount = wishes.filter((wish) => shown.has(wish._id)).length;
    const joinRequests = group.members.filter((m) => m.status === 'requested').length;
    const status = edition?.status;
    const todos = group.archivedAt
      ? []
      : [
          isOrganizer && joinRequests > 0 && { kind: 'joinRequests' as const, count: joinRequests },
          isOrganizer && status === 'draft' && { kind: 'draft' as const },
          isOrganizer &&
            status === 'open' &&
            participantCount >= MIN_PARTICIPANTS &&
            !edition?.drawAt && { kind: 'readyToDraw' as const },
          unanswered > 0 && { kind: 'question' as const, count: unanswered },
          (status === 'open' || status === 'drawn') && visibleWishCount === 0 && { kind: 'noWishes' as const },
          myGiftees.some((g) => g.editionId === edition?._id) &&
            !gifted.some((g) => g.editionId === edition?._id) && { kind: 'getGift' as const },
          status === 'giftday' && { kind: 'giftDay' as const },
          status === 'done' &&
            visibleWishCount > 0 &&
            edition?.giftDay !== undefined &&
            daysBetween(edition.giftDay.date, todayIn(group.timeZone)) <= MARK_RECEIVED_DAYS && {
              kind: 'markReceived' as const,
              count: visibleWishCount,
            },
        ].filter((todo) => todo !== false);
    return {
      slug: group.slug,
      name: group.name,
      role: member.role,
      archived: Boolean(group.archivedAt),
      edition: edition && {
        number: edition.number,
        title: edition.title,
        year: edition.year,
        status: edition.status,
        giftDay: edition.giftDay?.date,
        timeZone: group.timeZone,
        participantCount,
        gifteeReady: isDrawn(edition) && Boolean(edition.draw?.assignments[member.id]),
      },
      todos,
    };
  });
};
