// Guess your Santa (62, 94): a guess per giftee, changeable from the draw until that giftee's Santa is out (their turn
// in the presenter, or the big reveal). Nobody (not the organizer, not the Santa) sees a guess, a count or whether it's
// right before then; after it, the giftee's own guess and counts per name, never who guessed whom. Off hides it all.
// Late joiners, removals, re-draws, export and account deletion.
import { newId } from '@/lib/server/db';
import { expect, mailsTo, ok, test, type TestDb, type User } from '../fixtures';
import { code, drawnGroup, editionOf } from './s6-helpers';

type Input = { groupSlug: string; editionNumber: number };

/** Ann → Bob → Cee → Dan → Ann (Santa → giftee): Dan is Ann's Santa, Ann Bob's, Bob Cee's, Cee Dan's. */
const fixDraw = async (db: TestDb, slug: string, people: User[]) => {
  const group = (await db.groups.findOne({ slug }))!;
  const ids = people.map((p) => group.members.find((m) => m.userId === p.id)!.id);
  await db.editions.updateOne({ groupId: group._id, number: 1 }, { $set: { 'draw.assignments': Object.fromEntries(ids.map((id, i) => [id, ids[(i + 1) % ids.length]])) } });
  return ids;
};

const set = (user: User, at: Input, rows: [string, string][]) =>
  user.trpc.mutate('guess.set', { ...at, rows: rows.map(([gifteeMemberId, santaMemberId]) => ({ gifteeMemberId, santaMemberId })) });

/** Everything a person can read about this edition. */
const everything = async (user: User, at: Input, organizer: boolean) =>
  JSON.stringify([
    ok(await user.trpc.query('group.get', { groupSlug: at.groupSlug })),
    ok(await user.trpc.query('giftday.get', at)),
    organizer ? ok(await user.trpc.query('giftday.presenter', at)) : null,
    organizer ? ok(await user.trpc.query('gift.stillShopping', at)) : null,
    ok(await user.trpc.query('account.groups')),
  ]);

const advance = async (ann: User, at: Input, action: 'start' | 'spin' | 'santa' | 'more' | 'last' | 'back') => {
  const view = ok(await ann.trpc.query('giftday.presenter', at));
  return ann.trpc.mutate('giftday.advance', { ...at, action, turnsTaken: view.unwrapOrder!.turnsTaken });
};

test('a guess per giftee, changeable until that Santa is shown; nobody sees it before; scoreboard at the big reveal', async ({ signIn, db }) => {
  const people = await Promise.all(['ann', 'bob', 'cee', 'dan'].map((name) => signIn(name)));
  const [ann, bob, cee, dan] = people;
  const group = await drawnGroup(people, 'Guesses');
  const at = { groupSlug: group.slug, editionNumber: 1 };
  const [A, B, C, D] = await fixDraw(db, group.slug, people);
  const { _id: editionId } = await editionOf(db, group.slug);
  const all = () => Promise.all(people.map((p) => everything(p, at, p === ann)));
  const before = await all();

  await test.step('my rows: mine first, none for my own giftee; anyone else in the draw as Santa', async () => {
    expect(ok(await bob.trpc.query('guess.get', at))).toEqual({
      myGiftee: { memberId: C, name: 'Cee' },
      people: [{ memberId: A, name: 'Ann' }, { memberId: C, name: 'Cee' }, { memberId: D, name: 'Dan' }],
      rows: [
        { memberId: B, name: 'Bob', santa: null, open: true },
        { memberId: A, name: 'Ann', santa: null, open: true },
        { memberId: D, name: 'Dan', santa: null, open: true },
      ],
      result: null,
    });
    for (const rows of [[[C, A]], [[A, B]], [[A, A]], [[B, B]], [[newId(), A]], [[A, newId()]], [[A, D], [A, C]]] as [string, string][][]) {
      expect(code(await set(bob, at, rows)), JSON.stringify(rows)).toBe('INVALID_INPUT');
    }
    expect(await db.guesses.countDocuments({ editionId })).toBe(0);
  });

  await test.step('set, then changed: one row per giftee', async () => {
    ok(await set(bob, at, [[B, D]]));
    ok(await set(bob, at, [[B, A], [A, D]]));
    ok(await set(cee, at, [[C, D]]));
    expect(ok(await bob.trpc.query('guess.get', at))!.rows.map((row) => row.santa?.name ?? null)).toEqual(['Ann', 'Dan', null]);
    expect(await db.guesses.countDocuments({ editionId })).toBe(3);
  });

  await test.step('nothing anyone else reads changed: not the organizer, not the Santa', async () => {
    const after = await all();
    expect(after).toEqual(before);
    for (const text of after) expect(text).not.toMatch(/"right":true|"guess"|guessed|tally/);
    expect(ok(await ann.trpc.query('guess.get', at))!.rows.every((row) => row.santa === null)).toBe(true);
    expect(ok(await ann.trpc.query('account.export')).guessesMade).toEqual([]);
    expect(ok(await bob.trpc.query('account.export')).guessesMade.map(({ giftee, santa }) => [giftee, santa]).toSorted()).toEqual([
      ['Ann', 'Dan'],
      ['Bob', 'Ann'],
    ]);
  });

  await test.step('gift day keeps guessing open, back to shopping too', async () => {
    ok(await ann.trpc.mutate('manage.startGiftDay', at));
    ok(await set(dan, at, [[D, C]]));
    ok(await ann.trpc.mutate('manage.backToShopping', { ...at, giftDayDate: '2099-12-23' }));
    expect(ok(await dan.trpc.query('guess.get', at))!.rows[0]).toMatchObject({ santa: { memberId: C }, open: true });
    ok(await ann.trpc.mutate('manage.startGiftDay', at));
    await db.editions.updateOne({ _id: editionId }, { $set: { 'unwrapOrder.memberIds': [A, B, C, D] } });
  });

  await test.step("at the turn, until the Santa is shown: anyone guesses, the person unwrapping too; nobody sees a thing", async () => {
    ok(await advance(ann, at, 'start'));
    ok(await advance(ann, at, 'spin'));
    const turn = ok(await ann.trpc.query('giftday.presenter', at));
    expect(turn.unwrapOrder).toMatchObject({ current: { memberId: A }, santaToShow: true });
    expect(code(await advance(ann, at, 'last')), 'the turn ends after the Santa').toBe('EDITION_CHANGED');
    const during = await all();
    ok(await set(ann, at, [[A, B]]));
    ok(await set(cee, at, [[A, D]]));
    expect(code(await set(dan, at, [[A, B]])), "Ann's Santa").toBe('INVALID_INPUT');
    expect(await all()).toEqual(during);
    for (const p of people) expect(ok(await p.trpc.query('giftday.get', at)).guessing).toEqual({ results: [], right: 0, leaderboard: [] });
    expect(ok(await ann.trpc.query('guess.get', at))!.result).toBeNull();
  });

  await test.step("shown: the Santa, the giftee's own guess and the counts, never who; that row closes", async () => {
    const shown = ok(await advance(ann, at, 'santa'));
    const result = {
      memberId: A, giftee: 'Ann', santa: 'Dan', guess: 'Bob', right: false,
      tally: [{ memberId: D, name: 'Dan', count: 2 }, { memberId: B, name: 'Bob', count: 1 }],
    };
    expect(shown.unwrapOrder!.santaToShow).toBe(false);
    expect(shown.guessing).toMatchObject({ results: [result], right: 0 });
    for (const p of people) expect(ok(await p.trpc.query('giftday.get', at)).guessing!.results).toEqual([result]);
    expect(JSON.stringify(shown)).not.toMatch(/guesser/i);
    expect(ok(await ann.trpc.query('guess.get', at))!.result).toEqual({ santa: 'Dan', right: false });
    expect(code(await set(ann, at, [[A, D]]))).toBe('GUESSING_CLOSED');
    expect(code(await set(bob, at, [[D, A], [A, C]])), 'all or nothing').toBe('GUESSING_CLOSED');
    expect(ok(await bob.trpc.query('guess.get', at))!.rows.map((row) => [row.name, row.santa?.name ?? null, row.open])).toEqual([
      ['Bob', 'Ann', true],
      ['Ann', 'Dan', false],
      ['Dan', null, true],
    ]);
    ok(await set(bob, at, [[D, A]]));
    expect(code(await ann.trpc.mutate('manage.backToShopping', { ...at, giftDayDate: '2099-12-23' }))).toBe('GIFT_DAY_UNDERWAY');
    ok(await advance(ann, at, 'back'));
    expect(ok(await dan.trpc.query('giftday.get', at)).guessing!.results).toEqual([]);
    ok(await advance(ann, at, 'santa'));
    ok(await advance(ann, at, 'last'));
    expect(ok(await ann.trpc.query('giftday.presenter', at)).unwrapOrder).toMatchObject({ turnsTaken: 1, santaToShow: false });
    // Only the person whose turn it was is out.
    expect(ok(await ann.trpc.query('giftday.get', at)).guessing!.results.map((r) => r.memberId)).toEqual([A]);
  });

  await test.step('the big reveal is the scoreboard and closes every row', async () => {
    ok(await ann.trpc.mutate('giftday.setReveal', { ...at, enabled: true }));
    ok(await ann.trpc.mutate('giftday.reveal', at));
    const { guessing, reveal } = ok(await cee.trpc.query('giftday.get', at));
    expect(guessing!.results.map(({ giftee, guess, right }) => [giftee, guess, right])).toEqual([
      ['Ann', 'Bob', false],
      ['Bob', 'Ann', true],
      ['Cee', 'Dan', false],
      ['Dan', 'Cee', true],
    ]);
    expect(guessing!.right).toBe(2);
    expect(guessing!.results.map(({ giftee, santa }) => ({ giftee, santa }))).toEqual(reveal.pairs);
    expect(ok(await cee.trpc.query('guess.get', at))!.result).toEqual({ santa: 'Bob', right: false });
    expect(ok(await bob.trpc.query('guess.get', at))!.rows.some((row) => row.open)).toBe(false);
    expect(code(await set(bob, at, [[D, C]]))).toBe('GUESSING_CLOSED');
  });
});

test('organizer switch: off hides every guess and keeps Santas out of the turns', async ({ signIn, db }) => {
  const people = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const [ann, bob, cee] = people;
  const group = await drawnGroup(people, 'No guessing');
  const at = { groupSlug: group.slug, editionNumber: 1 };
  const [A, B, C] = await fixDraw(db, group.slug, people);
  ok(await set(bob, at, [[B, A]]));

  expect(code(await bob.trpc.mutate('guess.setEnabled', { ...at, enabled: false }))).toBe('NOT_ORGANIZER');
  expect(ok(await ann.trpc.query('group.get', { groupSlug: group.slug })).edition!.guessing).toBe(true);
  ok(await ann.trpc.mutate('guess.setEnabled', { ...at, enabled: false }));
  expect(ok(await ann.trpc.query('group.get', { groupSlug: group.slug })).edition!.guessing).toBe(false);
  expect(ok(await bob.trpc.query('guess.get', at))).toBeNull();
  expect(code(await set(cee, at, [[C, A]]))).toBe('GUESSING_CLOSED');

  ok(await ann.trpc.mutate('manage.startGiftDay', at));
  ok(await advance(ann, at, 'start'));
  ok(await advance(ann, at, 'spin'));
  const view = ok(await ann.trpc.query('giftday.presenter', at));
  expect(view.guessing).toBeNull();
  expect(view.unwrapOrder!.santaToShow).toBe(false);
  expect(code(await advance(ann, at, 'santa'))).toBe('EDITION_CHANGED');
  ok(await advance(ann, at, 'last'));
  ok(await ann.trpc.mutate('giftday.setReveal', { ...at, enabled: true }));
  ok(await ann.trpc.mutate('giftday.reveal', at));
  expect(ok(await bob.trpc.query('giftday.get', at)).guessing).toBeNull();

  // On again: the guess was only hidden.
  ok(await ann.trpc.mutate('guess.setEnabled', { ...at, enabled: true }));
  expect(ok(await bob.trpc.query('guess.get', at))!.rows[0].santa?.memberId).toBe(A);
});

test('a late joiner keeps the guesses; removal, account deletion and re-draw drop them', async ({ signIn, db }) => {
  const people = await Promise.all(['ann', 'bob', 'cee', 'dan'].map((name) => signIn(name)));
  const [ann, bob, cee, dan] = people;
  const group = await drawnGroup(people, 'Guess changes');
  const at = { groupSlug: group.slug, editionNumber: 1 };
  const [A, B, C, D] = await fixDraw(db, group.slug, people);
  const { _id: editionId } = await editionOf(db, group.slug);
  const rows = async () =>
    (await db.guesses.find({ editionId }).toArray()).map((g) => [g.guesserMemberId, g.gifteeMemberId, g.santaMemberId].join(' ')).toSorted();
  const row = (...ids: string[]) => ids.join(' ');

  ok(await set(bob, at, [[B, A], [A, D], [D, C]]));
  ok(await set(cee, at, [[C, A], [A, D], [B, A]]));
  ok(await set(dan, at, [[D, C], [B, C]]));

  await test.step('a late joiner slots in: guesses stay', async () => {
    const eve = await signIn('eve');
    ok(await eve.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name: 'Eve' }));
    expect(Object.keys((await editionOf(db, group.slug)).draw!.assignments)).toHaveLength(5);
    expect(await rows()).toHaveLength(8);
  });

  await test.step('removing Dan drops his rows, the row for him and those naming him', async () => {
    ok(await ann.trpc.mutate('settings.removePerson', { groupSlug: group.slug, memberId: D }));
    expect(await rows()).toEqual([row(B, B, A), row(C, B, A), row(C, C, A)].toSorted());
  });

  await test.step("account deletion: Bob's rows, the rows for him and those naming him go", async () => {
    const before = (await mailsTo(bob.email)).filter((mail) => mail.tags.length === 0).length;
    ok(await bob.trpc.mutate('account.requestDeletion'));
    let mails = await mailsTo(bob.email);
    await expect.poll(async () => (mails = (await mailsTo(bob.email)).filter((mail) => mail.tags.length === 0)).length).toBe(before + 1);
    ok(await bob.trpc.mutate('account.delete', { code: mails.at(-1)!.text.match(/\b(\d{6})\b/)![1] }));
    expect(await rows()).toEqual([row(C, C, A)]);
  });

  await test.step('a re-draw starts the guessing over', async () => {
    ok(await ann.trpc.mutate('draw.redraw', at));
    expect(await db.guesses.countDocuments({ editionId })).toBe(0);
  });
});

test('one by one: each Santa is shown once, on their first turn', async ({ signIn, db }) => {
  const people = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const [ann] = people;
  const group = await drawnGroup(people, 'Rounds');
  const at = { groupSlug: group.slug, editionNumber: 1 };
  ok(await ann.trpc.mutate('giftday.setMode', { ...at, mode: 'oneByOne' }));
  ok(await ann.trpc.mutate('manage.startGiftDay', at));
  const view = async () => ok(await ann.trpc.query('giftday.presenter', at));
  const order = (await view()).unwrapOrder!.people.map((p) => p.memberId);
  ok(await advance(ann, at, 'start'));
  ok(await advance(ann, at, 'spin'));
  // Round 1: everyone's Santa comes out once they've unwrapped.
  for (const [i, action] of (['more', 'more', 'more'] as const).entries()) {
    expect((await view()).unwrapOrder).toMatchObject({ current: { memberId: order[i] }, santaToShow: true });
    ok(await advance(ann, at, 'santa'));
    ok(await advance(ann, at, action));
    if (i < 2) ok(await advance(ann, at, 'spin'));
  }
  ok(await advance(ann, at, 'spin'));
  // Round 2: already out, the turn goes on without it; back undoes the turn, not the Santa.
  expect((await view()).unwrapOrder).toMatchObject({ current: { memberId: order[0] }, round: 2, santaToShow: false });
  expect((await view()).guessing!.results.map((r) => r.memberId)).toEqual(order);
  expect(code(await advance(ann, at, 'santa'))).toBe('EDITION_CHANGED');
  ok(await advance(ann, at, 'last'));
  ok(await advance(ann, at, 'back'));
  expect((await view()).unwrapOrder).toMatchObject({ current: { memberId: order[0] }, turnsTaken: 3, santaToShow: false });
  expect((await view()).guessing!.results).toHaveLength(3);
});
