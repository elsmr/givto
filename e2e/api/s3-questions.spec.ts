// S3 between people (anonymous Q&A and Psst!): delivery times, who
// reads what, rate limits, and that Ann (the giftee) never learns who her Santa is.
import { newId } from '@/lib/server/db';
import { expect, ok, test, type TrpcError } from '../fixtures';
import { seedBetween, type People } from './s3-seed';

const codeOf = (result: { error?: TrpcError }) => result.error?.data.appCode;

test('anonymous Q&A and Psst!: delivery, who reads what, limits', async ({ signIn, db }) => {
  const names = ['olive', 'ann', 'bob', 'cee', 'dan', 'nina', 'eve'] as const;
  const people = Object.fromEntries(await Promise.all(names.map(async (name) => [name, await signIn(name)]))) as People;
  const { olive, ann, bob, cee, dan, nina, eve } = people;
  const { m, e2, E1, E2, E3, drawE1, deliverQuestions, deliverNudges, annQueries } = await seedBetween(db, people);
  /** Every response Ann (the subject) gets, as [path, json], for the leak checks. */
  const annResponses: [string, string][] = [];
  // Q&A and Psst! start from a drawn edition.
  await drawE1();

  const question = await test.step('Q&A: the giftee sees the question only at the delivery time, with no asker identity', async () => {
    const question = ok(await dan.trpc.mutate('question.ask', { ...E1, text: 'What size are your feet?' }));
    const stored = (await db.questions.findOne({ _id: question.id }))!;
    const notifyAfter = stored.notifyAfter!;
    expect(notifyAfter.getTime() - stored.createdAt.getTime(), 'at least an hour later').toBeGreaterThanOrEqual(3600_000);
    expect(new Intl.DateTimeFormat('en', { timeZone: 'Europe/Brussels', hour: 'numeric', hourCycle: 'h23' }).format(notifyAfter)).toBe('18');
    expect(ok(await ann.trpc.query('question.forMe', E1)), 'not delivered yet').toEqual([]);
    expect(codeOf(await ann.trpc.mutate('question.answer', { ...E1, questionId: question.id, text: 'Early' }))).toBe('NOT_FOUND');
    await deliverQuestions();
    const forAnn = ok(await ann.trpc.query('question.forMe', E1));
    expect(forAnn.map((q) => [q.text, q.forName, q.answer])).toEqual([['What size are your feet?', null, null]]);
    expect(forAnn[0].askedAt!.getTime(), 'the real ask time stays hidden').not.toBe(stored.createdAt.getTime());
    annResponses.push(['question.forMe', JSON.stringify(forAnn)]);
    return question;
  });

  await test.step('Q&A: the answer reaches only the Santa; answered once; the organizer reads nothing', async () => {
    ok(await ann.trpc.mutate('question.answer', { ...E1, questionId: question.id, text: 'Size 39' }));
    expect(codeOf(await ann.trpc.mutate('question.answer', { ...E1, questionId: question.id, text: 'Again' }))).toBe('NOT_FOUND');
    expect(codeOf(await bob.trpc.mutate('question.answer', { ...E1, questionId: question.id, text: 'Me' }))).toBe('NOT_FOUND');
    const asked = ok(await dan.trpc.query('question.asked', E1))!;
    expect(asked.questions.map((q) => [q.text, q.answer?.text])).toEqual([['What size are your feet?', 'Size 39']]);
    for (const user of [olive, bob, cee]) {
      for (const path of ['question.forMe', 'question.asked'] as const) {
        const text = JSON.stringify(ok(await user.trpc.query(path, E1)));
        expect(!text.includes('feet') && !text.includes('Size 39'), `${path} leaks to another member`).toBe(true);
      }
    }
  });

  await test.step('questions to a managed member go to their manager, without the asker', async () => {
    ok(await bob.trpc.mutate('question.ask', { ...E1, text: 'Which dinosaur?' }));
    await deliverQuestions();
    const forOlive = ok(await olive.trpc.query('question.forMe', E1));
    expect(forOlive.map((q) => [q.text, q.forName])).toEqual([['Which dinosaur?', 'Kid']]);
    expect(JSON.stringify(forOlive)).not.toContain(m.bob.id);
    expect(JSON.stringify(forOlive)).not.toContain('Bob');
    ok(await olive.trpc.mutate('question.answer', { ...E1, questionId: forOlive[0].id, text: 'T. rex' }));
    expect(ok(await bob.trpc.query('question.asked', E1))!.questions[0].answer?.text).toBe('T. rex');
  });

  await test.step('a manager who is their managed member’s Santa can’t ask or Psst! (no talking to yourself)', async () => {
    const asked = ok(await olive.trpc.query('question.asked', E2))!;
    expect([asked.giftee.name, asked.canAsk, asked.answersOwnQuestions]).toEqual(['Kid', false, true]);
    expect(codeOf(await olive.trpc.mutate('question.ask', { ...E2, text: 'Hi me' }))).toBe('FORBIDDEN');
    expect(codeOf(await olive.trpc.mutate('nudge.send', { ...E2, kind: 'emptyWishlist' }))).toBe('FORBIDDEN');
    expect(ok(await olive.trpc.query('nudge.status', E2))!.canNudge).toBe(false);
    await db.questions.insertOne({
      _id: newId(),
      editionId: e2._id,
      gifteeMemberId: m.kid.id,
      askerMemberId: m.olive.id,
      text: 'Old thread',
      notifyAfter: new Date(0),
      createdAt: new Date(0),
    } as never);
    expect(ok(await olive.trpc.query('question.forMe', E2)), 'a thread with herself is left out').toEqual([]);
  });

  await test.step('Q&A: rate limited; non-Santas can’t ask', async () => {
    ok(await dan.trpc.mutate('question.ask', { ...E1, text: 'Favourite colour?' }));
    ok(await dan.trpc.mutate('question.ask', { ...E1, text: 'Tea or coffee?' }));
    expect(codeOf(await dan.trpc.mutate('question.ask', { ...E1, text: 'One more?' }))).toBe('RATE_LIMITED');
    expect(codeOf(await nina.trpc.mutate('question.ask', { ...E1, text: 'x' }))).toBe('NOT_SANTA');
    expect(ok(await nina.trpc.query('question.asked', E1))).toBeNull();
    expect(codeOf(await eve.trpc.mutate('question.ask', { ...E1, text: 'x' }))).toBe('GROUP_NOT_FOUND');
    expect(codeOf(await olive.trpc.mutate('question.ask', { ...E1, asMemberId: m.kid.id, text: 'x' })), 'Kid drew Olive').toBe('NOT_SANTA');
    expect(codeOf(await ann.trpc.mutate('question.ask', { ...E3, text: 'x' }))).toBe('NOT_DRAWN');
  });

  await test.step('Psst!: "add wishes" only while the wishlist is empty; one per Santa per 3 days', async () => {
    const status = ok(await dan.trpc.query('nudge.status', E1))!;
    expect([status.giftee.name, status.kind, status.canNudge, status.nextAt]).toEqual(['Ann', 'emptyWishlist', true, null]);
    expect(codeOf(await dan.trpc.mutate('nudge.send', { ...E1, kind: 'moreDetails' }))).toBe('WRONG_NUDGE_KIND');
    ok(await dan.trpc.mutate('nudge.send', { ...E1, kind: 'emptyWishlist' }));
    expect(codeOf(await dan.trpc.mutate('nudge.send', { ...E1, kind: 'emptyWishlist' }))).toBe('RATE_LIMITED');
    const after = ok(await dan.trpc.query('nudge.status', E1))!;
    expect(after.canNudge).toBe(false);
    expect(after.nextAt!.getTime() - Date.now()).toBeGreaterThan(2.9 * 24 * 3600_000);
    ok(await dan.trpc.mutate('wish.create', { title: 'Dan wants a kite', groupSlugs: [E1.groupSlug] }));
    expect(ok(await cee.trpc.query('nudge.status', E1))!.kind, 'Dan has wishes').toBe('moreDetails');
    expect(codeOf(await cee.trpc.mutate('nudge.send', { ...E1, kind: 'emptyWishlist' }))).toBe('WRONG_NUDGE_KIND');
    ok(await cee.trpc.mutate('nudge.send', { ...E1, kind: 'moreDetails' }));
    expect(codeOf(await nina.trpc.mutate('nudge.send', { ...E1, kind: 'emptyWishlist' }))).toBe('NOT_SANTA');
    expect(codeOf(await eve.trpc.mutate('nudge.send', { ...E1, kind: 'emptyWishlist' }))).toBe('GROUP_NOT_FOUND');
  });

  await test.step('Psst!: the giftee sees it from the delivery time, anonymously; "add wishes" clears once they add one', async () => {
    expect(ok(await ann.trpc.query('nudge.forMe', E1)), 'not delivered yet').toEqual([]);
    await deliverNudges();
    const forAnn = ok(await ann.trpc.query('nudge.forMe', E1));
    expect(forAnn.map((n) => [n.kind, n.forName])).toEqual([['emptyWishlist', null]]);
    expect(Object.keys(forAnn[0]).sort()).toEqual(['forName', 'id', 'kind']);
    expect(ok(await dan.trpc.query('nudge.forMe', E1)).map((n) => n.kind)).toEqual(['moreDetails']);
    expect(ok(await olive.trpc.query('nudge.forMe', E1)), 'the organizer sees no one else’s').toEqual([]);
    ok(await ann.trpc.mutate('wish.create', { title: 'Ann wants a mug', groupSlugs: [E1.groupSlug] }));
    expect(ok(await ann.trpc.query('nudge.forMe', E1))).toEqual([]);
  });

  await test.step('Ann’s responses never name her Santa', async () => {
    await annQueries(annResponses);
    // tip.authored lists everyone Ann can leave a tip about, Dan included, so it's not checked here.
    for (const [path, text] of annResponses.filter(([path]) => path !== 'tip.authored')) {
      for (const secret of [m.dan.id, 'Dan', 'askerMemberId', 'santaMemberId']) expect(text, `${secret} in ${path}`).not.toContain(secret);
    }
  });
});
