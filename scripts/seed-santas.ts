// Between Santas and giftees in a drawn edition, for `pnpm seed`: Dibs!, tips, questions and a Psst!.
import type { Group } from '../lib/schema/group';
import { newId, type Collections } from '../lib/server/db';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Delivered already (`notifiedAt`/`sentAt` in the past), so the next cron tick doesn't email them. */
export const seedBetweenSantas = async (db: Collections, group: Group, editionId: string, youUserId: string, now: Date) => {
  const daysAgo = (days: number) => new Date(now.getTime() - days * DAY_MS);
  const { draw } = (await db.editions.findOne({ _id: editionId }))!;
  const assignments = draw!.assignments;
  const you = group.members.find((m) => m.userId === youUserId)!.id;
  const giftee = assignments[you];
  const santaOfYou = Object.keys(assignments).find((santa) => assignments[santa] === you)!;
  const others = Object.keys(assignments).filter((id) => id !== you && id !== giftee);
  const userIdOf = (memberId: string) => group.members.find((m) => m.id === memberId)!.userId!;

  // Dibs!: yours on your giftee's first wish, and every other Santa's on theirs.
  for (const [i, [santa, gifteeId]] of Object.entries(assignments).entries()) {
    if (santa !== you && i % 2 === 1) continue;
    const wish = await db.wishes.findOne({ ownerId: userIdOf(gifteeId), kind: 'wish' }, { sort: { position: 1 } });
    if (wish) {
      await db.claims.insertOne({ _id: newId(), wishId: wish._id, ownerId: wish.ownerId, editionId, santaMemberId: santa, createdAt: daysAgo(3) });
    }
  }

  const tip = (aboutMemberId: string, authorMemberId: string, text: string, anonymous: boolean) => ({
    _id: newId(),
    editionId,
    aboutMemberId,
    authorMemberId,
    text,
    anonymous,
    createdAt: daysAgo(4),
    updatedAt: daysAgo(4),
  });
  await db.tips.insertMany([
    tip(giftee, others[0], 'Has been talking about learning to cook Thai food all year.', false),
    tip(giftee, others[1], 'Their old scarf is falling apart. Just saying.', true),
    tip(others[2], you, 'Loves anything with a good story behind it.', false),
  ]);

  const delivered = { notifyAfter: daysAgo(1), notifiedAt: daysAgo(1) };
  await db.questions.insertMany([
    { _id: newId(), editionId, gifteeMemberId: you, askerMemberId: santaOfYou, text: 'Dark or milk chocolate?', ...delivered, createdAt: daysAgo(2) },
    {
      _id: newId(),
      editionId,
      gifteeMemberId: giftee,
      askerMemberId: you,
      text: 'Do you already have a good umbrella?',
      ...delivered,
      answer: { text: 'I do! But warm gloves would be lovely.', answeredAt: daysAgo(1), ...delivered },
      createdAt: daysAgo(2),
    },
  ]);

  await db.nudges.insertOne({
    _id: newId(),
    editionId,
    santaMemberId: santaOfYou,
    gifteeMemberId: you,
    kind: 'moreDetails',
    sendAfter: daysAgo(1),
    sentAt: daysAgo(1),
    createdAt: daysAgo(2),
  });
};
