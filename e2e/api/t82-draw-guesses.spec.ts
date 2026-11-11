// Guess the whole draw (82): optional rows on top of the 62 guess. Nobody sees a board or a score before
// its pairs are out; points count only the pairs that are out; the leaderboard at the big reveal matches
// a hand-computed fixture. Removal, account deletion, re-draw and export cover the boards.
import { newId } from '@/lib/server/db';
import { expect, mailsTo, ok, test, type TestDb, type User } from '../fixtures';
import { code, drawnGroup, editionOf } from './s6-helpers';

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

const advance = async (ann: User, at: Input, action: 'start' | 'spin' | 'vote' | 'tally' | 'santa') => {
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
  const make = (user: User, memberId: string, pairs: [string, string][]) =>
    user.trpc.mutate('guess.make', { ...at, memberId, pairs: pairs.map(([gifteeMemberId, santaMemberId]) => ({ gifteeMemberId, santaMemberId })) });

  await test.step('my board: my giftee is mine, a row for everyone else', async () => {
    expect(ok(await bob.trpc.query('guess.mine', at))!.board).toEqual({
      myGiftee: { memberId: C, name: 'Cee' },
      rows: [
        { memberId: A, name: 'Ann', santa: null },
        { memberId: D, name: 'Dan', santa: null },
      ],
    });
  });

  await test.step('rows: not my giftee, not me, each Santa once, never the giftee themselves', async () => {
    for (const pairs of [[[C, A]], [[B, A]], [[A, B]], [[A, A]], [[D, A]], [[A, D], [A, C]], [[newId(), D]]] as [string, string][][]) {
      expect(code(await make(bob, A, pairs)), JSON.stringify(pairs)).toBe('INVALID_INPUT');
    }
    expect(await db.guesses.countDocuments({ editionId: (await editionOf(db, group.slug))._id })).toBe(0);
  });

  const before = await Promise.all(people.map((p) => everything(p, at, p === ann)));

  await test.step('locked in; nothing anyone else reads changed', async () => {
    // Bob: all right (3). Cee: own wrong, Ann's right (1). Dan: own right, no rows (1). Ann doesn't play.
    ok(await make(bob, A, [[A, D], [D, C]]));
    ok(await make(cee, A, [[A, D]]));
    ok(await make(dan, C, []));
    expect(code(await make(bob, A, []))).toBe('GUESS_LOCKED');
    expect(await Promise.all(people.map((p) => everything(p, at, p === ann)))).toEqual(before);
    expect(ok(await bob.trpc.query('guess.mine', at))!.board!.rows.map((row) => row.santa?.name)).toEqual(['Dan', 'Cee']);
    expect(ok(await dan.trpc.query('guess.mine', at))!.board!.rows.map((row) => row.santa)).toEqual([null, null]);
    expect(ok(await bob.trpc.query('account.export')).guessesMade).toEqual([
      expect.objectContaining({ guessed: 'Ann', board: [{ giftee: 'Ann', santa: 'Dan' }, { giftee: 'Dan', santa: 'Cee' }] }),
    ]);
  });

  ok(await ann.trpc.mutate('manage.startGiftDay', at));
  const edition = await editionOf(db, group.slug);
  await db.editions.updateOne({ _id: edition._id }, { $set: { 'unwrapOrder.memberIds': [A, B, C, D] } });

  await test.step('a turn: only the pair that came out scores', async () => {
    ok(await advance(ann, at, 'start'));
    ok(await advance(ann, at, 'spin'));
    expect(ok(await ann.trpc.query('giftday.presenter', at)).guessing!.leaderboard).toEqual([]);
    ok(await advance(ann, at, 'vote'));
    ok(await advance(ann, at, 'tally'));
    const shown = ok(await advance(ann, at, 'santa'));
    // Ann's Santa (Dan) is out: Bob and Cee had it; Dan gives to Ann, a row he never had.
    const leaderboard = [
      { memberId: B, name: 'Bob', points: 1 },
      { memberId: C, name: 'Cee', points: 1 },
      { memberId: D, name: 'Dan', points: 0 },
    ];
    expect(shown.guessing!.leaderboard).toEqual(leaderboard);
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

test('removal and account deletion drop the rows naming them; a re-draw drops the boards', async ({ signIn, db }) => {
  const people = await Promise.all(['ann', 'bob', 'cee', 'dan'].map((name) => signIn(name)));
  const [ann, bob, cee, dan] = people;
  const group = await drawnGroup(people, 'Board changes');
  const at = { groupSlug: group.slug, editionNumber: 1 };
  const eve = await signIn('eve');
  ok(await eve.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name: 'Eve' }));
  // Ann → Bob → Cee → Dan → Eve → Ann.
  const { ids: [A, B, C, D, E] } = await fixDraw(db, group.slug, [...people, eve]);
  const editionId = (await editionOf(db, group.slug))._id;
  const make = async (user: User, memberId: string, pairs: [string, string][]) =>
    ok(await user.trpc.mutate('guess.make', { ...at, memberId, pairs: pairs.map(([gifteeMemberId, santaMemberId]) => ({ gifteeMemberId, santaMemberId })) }));
  const boards = async () =>
    Object.fromEntries(
      (await db.guesses.find({ editionId }).toArray()).map((g) => [g.guesserMemberId, (g.pairs ?? []).map((p) => [p.gifteeMemberId, p.santaMemberId])])
    );

  await make(bob, A, [[A, E], [D, C], [E, D]]);
  await make(cee, E, [[A, B], [B, A], [E, D]]);
  await make(dan, A, []);
  await make(eve, B, []);

  await test.step("removing Dan: his board goes, rows naming him leave the others' boards", async () => {
    ok(await ann.trpc.mutate('settings.removePerson', { groupSlug: group.slug, memberId: D }));
    expect(await boards()).toEqual({ [B]: [[A, E]], [C]: [[A, B], [B, A]], [E]: [] });
  });

  await test.step("Bob deletes his account: his board, Eve's guess naming him, and rows naming him go", async () => {
    const before = (await mailsTo(bob.email)).filter((mail) => mail.tags.length === 0).length;
    ok(await bob.trpc.mutate('account.requestDeletion'));
    let mails = await mailsTo(bob.email);
    await expect.poll(async () => (mails = (await mailsTo(bob.email)).filter((mail) => mail.tags.length === 0)).length).toBe(before + 1);
    ok(await bob.trpc.mutate('account.delete', { code: mails.at(-1)!.text.match(/\b(\d{6})\b/)![1] }));
    expect(await boards()).toEqual({ [C]: [] });
  });

  await test.step('a re-draw drops every board', async () => {
    ok(await ann.trpc.mutate('draw.redraw', at));
    expect(await db.guesses.countDocuments({ editionId })).toBe(0);
  });
});
