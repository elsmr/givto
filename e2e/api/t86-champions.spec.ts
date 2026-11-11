// Champions and badges (86): results kept when an edition becomes done, from only what was out; they outlive
// the guesses, go with the person on account deletion and are in the export; champions and badges over
// three editions.
import { newId } from '@/lib/server/db';
import { expect, mailsTo, ok, test, type TestDb, type User } from '../fixtures';
import { drawnGroup, editionOf } from './s6-helpers';

type Input = { groupSlug: string; editionNumber: number };

/** Ann → Bob → Cee → Dan → Ann (Santa → giftee). */
const fixDraw = async (db: TestDb, slug: string, people: User[]) => {
  const group = (await db.groups.findOne({ slug }))!;
  const ids = people.map((p) => group.members.find((m) => m.userId === p.id)!.id);
  await db.editions.updateOne({ groupId: group._id, number: 1 }, { $set: { 'draw.assignments': Object.fromEntries(ids.map((id, i) => [id, ids[(i + 1) % ids.length]])) } });
  return ids;
};

/** Bob: all right (3, his own Santa too). Cee: own wrong, Ann's right (1). Dan: own right (1). Ann doesn't play. */
const play = async (at: Input, [, bob, cee, dan]: User[], [A, , C, D]: string[]) => {
  const make = (user: User, memberId: string, pairs: [string, string][]) =>
    user.trpc.mutate('guess.make', { ...at, memberId, pairs: pairs.map(([gifteeMemberId, santaMemberId]) => ({ gifteeMemberId, santaMemberId })) });
  ok(await make(bob, A, [[A, D], [D, C]]));
  ok(await make(cee, A, [[A, D]]));
  ok(await make(dan, C, []));
};

const advance = async (ann: User, at: Input, action: 'start' | 'spin' | 'vote' | 'tally' | 'santa') => {
  const view = ok(await ann.trpc.query('giftday.presenter', at));
  return ok(await ann.trpc.mutate('giftday.advance', { ...at, action, turnsTaken: view.unwrapOrder!.turnsTaken }));
};

test('results at done: only what was out; outlive the guesses; champions and badges; export; account deletion', async ({ signIn, db }) => {
  const people = await Promise.all(['ann', 'bob', 'cee', 'dan'].map((name) => signIn(name)));
  const [ann, bob, cee] = people;
  const group = await drawnGroup(people, 'Champions');
  const at = { groupSlug: group.slug, editionNumber: 1 };
  const ids = await fixDraw(db, group.slug, people);
  const [A, B, C, D] = ids;
  await play(at, people, ids);
  const edition = await editionOf(db, group.slug);
  const results = async () => {
    const { points, nailedIds, drawSize } = (await db.editions.findOne({ _id: edition._id }))!.results ?? {};
    return points && { points, nailedIds, drawSize };
  };
  const view = async (user: User) => {
    const { editions, members } = ok(await user.trpc.query('group.get', { groupSlug: group.slug }));
    return { champions: editions.map((e) => e.champions), badges: Object.fromEntries(members.map((m) => [m.name, m.badges])) };
  };

  await test.step('done with nothing out (reveal off, no turn): nothing kept', async () => {
    ok(await ann.trpc.mutate('manage.startGiftDay', at));
    expect(await results()).toBeUndefined();
    ok(await ann.trpc.mutate('manage.finishGiftDay', at));
    expect(await results()).toBeUndefined();
    expect((await view(bob)).champions).toEqual([[]]);
  });

  await test.step("done after Ann's turn: only her Santa scores; a shared title", async () => {
    ok(await ann.trpc.mutate('manage.reopenGiftDay', at));
    await db.editions.updateOne({ _id: edition._id }, { $set: { 'unwrapOrder.memberIds': [A, B, C, D] } });
    for (const action of ['start', 'spin', 'vote', 'tally', 'santa'] as const) await advance(ann, at, action);
    ok(await ann.trpc.mutate('manage.finishGiftDay', at));
    expect(await results()).toEqual({
      points: [{ memberId: B, points: 1 }, { memberId: C, points: 1 }, { memberId: D, points: 0 }],
      nailedIds: [],
      drawSize: 4,
    });
    expect(await view(cee)).toEqual({
      champions: [['Bob', 'Cee']],
      badges: { Ann: [], Bob: [{ kind: 'champion', count: 1 }], Cee: [{ kind: 'champion', count: 1 }], Dan: [] },
    });
  });

  await test.step('reopened, big reveal on, done again: everything scores', async () => {
    ok(await ann.trpc.mutate('manage.reopenGiftDay', at));
    ok(await ann.trpc.mutate('giftday.setReveal', { ...at, enabled: true }));
    ok(await ann.trpc.mutate('manage.finishGiftDay', at));
    expect(await results()).toEqual({
      points: [{ memberId: B, points: 3 }, { memberId: C, points: 1 }, { memberId: D, points: 1 }],
      nailedIds: [B, D],
      drawSize: 4,
    });
    expect(await view(ann)).toEqual({
      champions: [['Bob']],
      badges: {
        Ann: [],
        Bob: [{ kind: 'champion', count: 1 }, { kind: 'perfect', count: 1 }, { kind: 'nailed', count: 1 }],
        Cee: [],
        Dan: [{ kind: 'nailed', count: 1 }],
      },
    });
    const exported = (user: User) => user.trpc.query('account.export').then((r) => ok(r).editions.map((e) => e.result));
    expect(await exported(bob)).toEqual([{ points: 3, nailedIt: true }]);
    expect(await exported(cee)).toEqual([{ points: 1, nailedIt: false }]);
    expect(await exported(ann)).toEqual([undefined]);
  });

  // Retention itself keeping them: s7-reminders-retention (the cron specs run on their own).
  await test.step('guesses gone (retention): finished again, the results stay', async () => {
    const kept = await results();
    await db.guesses.deleteMany({ editionId: edition._id });
    ok(await ann.trpc.mutate('manage.reopenGiftDay', at));
    ok(await ann.trpc.mutate('manage.finishGiftDay', at));
    expect(await results()).toEqual(kept);
  });

  await test.step('three editions: shared titles, back to back, perfect boards', async () => {
    const first = (await db.editions.findOne({ _id: edition._id }))!;
    const later = (number: number, points: Record<string, number>, nailedIds: string[]) => ({
      ...first,
      _id: newId(),
      number,
      title: `Secret Santa ${number}`,
      results: { points: Object.entries(points).map(([memberId, p]) => ({ memberId, points: p })), nailedIds, drawSize: 4, savedAt: new Date() },
    });
    await db.editions.insertMany([later(2, { [B]: 2, [C]: 2 }, [C]), later(3, { [D]: 3, [B]: 1 }, [D])]);
    expect(await view(bob)).toEqual({
      champions: [['Dan'], ['Bob', 'Cee'], ['Bob']],
      badges: {
        Ann: [],
        Bob: [{ kind: 'champion', count: 2 }, { kind: 'backToBack', count: 1 }, { kind: 'perfect', count: 1 }, { kind: 'nailed', count: 1 }],
        Cee: [{ kind: 'champion', count: 1 }, { kind: 'nailed', count: 1 }],
        Dan: [{ kind: 'champion', count: 1 }, { kind: 'perfect', count: 1 }, { kind: 'nailed', count: 2 }],
      },
    });
  });

  await test.step("Bob deletes his account: his entries go from every edition's results", async () => {
    const before = (await mailsTo(bob.email)).filter((mail) => mail.tags.length === 0).length;
    ok(await bob.trpc.mutate('account.requestDeletion'));
    let mails = await mailsTo(bob.email);
    await expect.poll(async () => (mails = (await mailsTo(bob.email)).filter((mail) => mail.tags.length === 0)).length).toBe(before + 1);
    ok(await bob.trpc.mutate('account.delete', { code: mails.at(-1)!.text.match(/\b(\d{6})\b/)![1] }));
    expect(await db.editions.countDocuments({ $or: [{ 'results.points.memberId': B }, { 'results.nailedIds': B }] })).toBe(0);
    expect((await view(cee)).champions).toEqual([['Dan'], ['Cee'], ['Cee', 'Dan']]);
  });
});

test('the gift day job keeps the results when it moves an edition to done', async ({ signIn, db }) => {
  const people = await Promise.all(['ann', 'bob', 'cee', 'dan'].map((name) => signIn(name)));
  const [ann] = people;
  const group = await drawnGroup(people, 'Champions by date');
  const at = { groupSlug: group.slug, editionNumber: 1 };
  const ids = await fixDraw(db, group.slug, people);
  await play(at, people, ids);
  ok(await ann.trpc.mutate('giftday.setReveal', { ...at, enabled: true }));
  const edition = await editionOf(db, group.slug);
  ok(await ann.trpc.mutate('giftday.runDue', { now: '2099-12-26T12:00:00.000Z', editionIds: [edition._id] }));
  const after = (await db.editions.findOne({ _id: edition._id }))!;
  expect(after.status).toBe('done');
  expect(after.results?.points.map((entry) => entry.points)).toEqual([3, 1, 1]);
});
