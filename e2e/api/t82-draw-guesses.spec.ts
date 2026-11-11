// Guess the whole draw (82): a point per right pair. Nobody sees a board or a score before its pairs are out; points
// count only the pairs that are out; the leaderboard at the big reveal matches a hand-computed fixture.
import { expect, ok, test, type TestDb, type User } from '../fixtures';
import { drawnGroup, editionOf } from './s6-helpers';

type Input = { groupSlug: string; editionNumber: number };

/** A fixed draw, so the boards and their points are known: Santa → giftee in the order given, last to first. */
const fixDraw = async (db: TestDb, slug: string, people: User[]) => {
  const group = (await db.groups.findOne({ slug }))!;
  const ids = people.map((p) => group.members.find((m) => m.userId === p.id)!.id);
  const assignments = Object.fromEntries(ids.map((id, i) => [id, ids[(i + 1) % ids.length]]));
  await db.editions.updateOne({ groupId: group._id, number: 1 }, { $set: { 'draw.assignments': assignments } });
  return { ids, nameOf: (id: string) => group.members.find((m) => m.id === id)!.name };
};

const everything = async (user: User, at: Input, organizer: boolean) =>
  JSON.stringify([
    ok(await user.trpc.query('group.get', { groupSlug: at.groupSlug })),
    ok(await user.trpc.query('giftday.get', at)),
    organizer ? ok(await user.trpc.query('giftday.presenter', at)) : null,
    ok(await user.trpc.query('account.groups')),
  ]);

const advance = async (ann: User, at: Input, action: 'start' | 'spin' | 'santa') => {
  const view = ok(await ann.trpc.query('giftday.presenter', at));
  return ann.trpc.mutate('giftday.advance', { ...at, action, turnsTaken: view.unwrapOrder!.turnsTaken });
};

test('boards stay hidden until their pairs are out; the leaderboard counts only what is out', async ({ signIn, db }) => {
  const people = await Promise.all(['ann', 'bob', 'cee', 'dan'].map((name) => signIn(name)));
  const [ann, bob, cee, dan] = people;
  const group = await drawnGroup(people, 'Boards');
  const at = { groupSlug: group.slug, editionNumber: 1 };
  // Ann → Bob → Cee → Dan → Ann.
  const { ids: [A, B, C, D], nameOf } = await fixDraw(db, group.slug, people);
  const set = (user: User, rows: [string, string][]) =>
    user.trpc.mutate('guess.set', { ...at, rows: rows.map(([gifteeMemberId, santaMemberId]) => ({ gifteeMemberId, santaMemberId })) });
  const before = await Promise.all(people.map((p) => everything(p, at, p === ann)));

  await test.step('guessed; nothing anyone else reads changed', async () => {
    // Bob: all right (3). Cee: own wrong, Ann's right (1). Dan: own right, no other rows (1). Ann doesn't play.
    ok(await set(bob, [[B, A], [A, D], [D, C]]));
    ok(await set(cee, [[C, A], [A, D]]));
    ok(await set(dan, [[D, C]]));
    expect(await Promise.all(people.map((p) => everything(p, at, p === ann)))).toEqual(before);
  });

  ok(await ann.trpc.mutate('manage.startGiftDay', at));
  const edition = await editionOf(db, group.slug);
  await db.editions.updateOne({ _id: edition._id }, { $set: { 'unwrapOrder.memberIds': [A, B, C, D] } });

  await test.step('a turn: only the pair that came out scores', async () => {
    ok(await advance(ann, at, 'start'));
    ok(await advance(ann, at, 'spin'));
    expect(ok(await ann.trpc.query('giftday.presenter', at)).guessing!.leaderboard).toEqual([]);
    const shown = ok(await advance(ann, at, 'santa'));
    // Ann's Santa (Dan) is out: Bob and Cee had it; Dan gives to Ann, a row he never had.
    const leaderboard = [
      { memberId: B, name: 'Bob', points: 1 },
      { memberId: C, name: 'Cee', points: 1 },
      { memberId: D, name: 'Dan', points: 0 },
    ];
    expect(shown.guessing!.leaderboard).toEqual(leaderboard);
    expect(shown.guessing!.results[0].tally).toEqual([{ memberId: D, name: 'Dan', count: 2 }]);
    expect(ok(await cee.trpc.query('giftday.get', at)).guessing!.leaderboard).toEqual(leaderboard);
  });

  await test.step('the big reveal scores the rest', async () => {
    ok(await ann.trpc.mutate('giftday.setReveal', { ...at, enabled: true }));
    ok(await ann.trpc.mutate('giftday.reveal', at));
    expect(ok(await dan.trpc.query('giftday.get', at)).guessing!.leaderboard.map(({ memberId, points }) => [nameOf(memberId), points])).toEqual([
      ['Bob', 3],
      ['Cee', 1],
      ['Dan', 1],
    ]);
  });

  await test.step('guessing off hides the leaderboard too', async () => {
    ok(await ann.trpc.mutate('guess.setEnabled', { ...at, enabled: false }));
    expect(ok(await bob.trpc.query('giftday.get', at)).guessing).toBeNull();
  });
});
