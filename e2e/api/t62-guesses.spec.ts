// Guess your Santa (62): one locked guess while shopping; nobody (not the organizer, not the Santa)
// sees a guess or whether it's right before its reveal: the person's turn in the presenter, or the
// big reveal (the scoreboard). Off hides it all. Re-draws, removals, retention, export and deletion.
import { newId } from '@/lib/server/db';
import { expect, mailsTo, ok, test, type User } from '../fixtures';
import { code, drawnGroup, editionOf } from './s6-helpers';

type Input = { groupSlug: string; editionNumber: number };

const peopleOf = async (db: Parameters<typeof editionOf>[0], slug: string, people: User[]) => {
  const group = (await db.groups.findOne({ slug }))!;
  const assignments = (await editionOf(db, slug)).draw!.assignments;
  const idOf = (user: User) => group.members.find((m) => m.userId === user.id)!.id;
  const byId = (id: string) => people.find((p) => idOf(p) === id)!;
  const nameOf = (id: string) => group.members.find((m) => m.id === id)!.name;
  const santaOf = (user: User) => byId(Object.entries(assignments).find(([, giftee]) => giftee === idOf(user))![0]);
  return { idOf, nameOf, santaOf, assignments };
};

/** Everything a person can read about this edition. */
const everything = async (user: User, at: Input, organizer: boolean) =>
  JSON.stringify([
    ok(await user.trpc.query('group.get', { groupSlug: at.groupSlug })),
    ok(await user.trpc.query('giftday.get', at)),
    organizer ? ok(await user.trpc.query('giftday.presenter', at)) : null,
    organizer ? ok(await user.trpc.query('gift.stillShopping', at)) : null,
    ok(await user.trpc.query('account.groups')),
  ]);

const advance = async (ann: User, at: Input, action: 'start' | 'spin' | 'vote' | 'tally' | 'santa' | 'more' | 'last' | 'back') => {
  const view = ok(await ann.trpc.query('giftday.presenter', at));
  return ann.trpc.mutate('giftday.advance', { ...at, action, turnsTaken: view.unwrapOrder!.turnsTaken });
};

test('guess once, locked; nobody sees it or whether it is right until the turn; scoreboard at the big reveal', async ({ signIn, db }) => {
  const people = await Promise.all(['ann', 'bob', 'cee', 'dan'].map((name) => signIn(name)));
  const [ann, bob, cee, dan] = people;
  const group = await drawnGroup(people, 'Guesses');
  const at = { groupSlug: group.slug, editionNumber: 1 };
  const { idOf, nameOf, santaOf } = await peopleOf(db, group.slug, people);
  // Bob guesses right, Cee guesses wrong, Dan and Ann don't guess.
  const bobsSanta = santaOf(bob);
  const ceesWrong = people.find((p) => p !== cee && p !== santaOf(cee))!;
  const before = await Promise.all(people.map((p) => everything(p, at, p === ann)));

  await test.step('who you can pick: everyone else in the draw, your own giftee too', async () => {
    const mine = ok(await bob.trpc.query('guess.mine', at))!;
    expect(mine).toMatchObject({ open: true, guess: null, result: null });
    expect(mine.people.map((p) => p.memberId).toSorted()).toEqual([ann, cee, dan].map(idOf).toSorted());
    expect(code(await bob.trpc.mutate('guess.make', { ...at, memberId: idOf(bob) }))).toBe('NOT_FOUND');
    expect(code(await bob.trpc.mutate('guess.make', { ...at, memberId: newId() }))).toBe('NOT_FOUND');
  });

  await test.step('one guess, locked in; right or wrong looks the same', async () => {
    expect(ok(await bob.trpc.mutate('guess.make', { ...at, memberId: idOf(bobsSanta) }))).toEqual({ ok: true });
    expect(ok(await cee.trpc.mutate('guess.make', { ...at, memberId: idOf(ceesWrong) }))).toEqual({ ok: true });
    expect(code(await bob.trpc.mutate('guess.make', { ...at, memberId: idOf(dan) }))).toBe('GUESS_LOCKED');
    expect(ok(await bob.trpc.query('guess.mine', at))).toEqual({
      open: false, guess: { memberId: idOf(bobsSanta), name: nameOf(idOf(bobsSanta)) }, people: [], result: null, board: expect.anything(),
    });
    expect(ok(await cee.trpc.query('guess.mine', at))).toEqual({
      open: false, guess: { memberId: idOf(ceesWrong), name: nameOf(idOf(ceesWrong)) }, people: [], result: null, board: expect.anything(),
    });
    expect(await db.guesses.countDocuments({ editionId: (await editionOf(db, group.slug))._id })).toBe(2);
  });

  await test.step('nothing anyone else reads changed: not the organizer, not the Santa', async () => {
    const after = await Promise.all(people.map((p) => everything(p, at, p === ann)));
    expect(after).toEqual(before);
    for (const text of after) expect(text).not.toMatch(/"right":true|"guess"|guessed/);
    expect(ok(await ann.trpc.query('guess.mine', at))!.guess).toBeNull();
    expect(ok(await bobsSanta.trpc.query('guess.mine', at))!.guess?.memberId).not.toBe(idOf(bobsSanta));
    expect(ok(await bobsSanta.trpc.query('account.export')).guessesMade).toEqual(
      bobsSanta === cee ? [expect.objectContaining({ guessed: nameOf(idOf(ceesWrong)) })] : []
    );
    expect(ok(await bob.trpc.query('account.export')).guessesMade).toEqual([expect.objectContaining({ guessed: nameOf(idOf(bobsSanta)) })]);
  });

  await test.step('gift day closes guessing; back to shopping opens it again', async () => {
    ok(await ann.trpc.mutate('manage.startGiftDay', at));
    expect(code(await dan.trpc.mutate('guess.make', { ...at, memberId: idOf(ann) }))).toBe('GUESSING_CLOSED');
    expect(ok(await dan.trpc.query('guess.mine', at))).toMatchObject({ open: false, people: [], result: null });
    ok(await ann.trpc.mutate('manage.backToShopping', { ...at, giftDayDate: '2099-12-23' }));
    expect(ok(await dan.trpc.query('guess.mine', at))!.open).toBe(true);
    ok(await ann.trpc.mutate('manage.startGiftDay', at));
  });

  const order = ok(await ann.trpc.query('giftday.presenter', at)).unwrapOrder!.people.map((p) => p.memberId);
  const first = people.find((p) => idOf(p) === order[0])!;

  await test.step("the presenter shows the Santa only after they've unwrapped", async () => {
    ok(await advance(ann, at, 'start'));
    ok(await advance(ann, at, 'spin'));
    const turn = ok(await ann.trpc.query('giftday.presenter', at));
    expect(turn.unwrapOrder).toMatchObject({ current: { memberId: idOf(first) }, santaToShow: true });
    expect(turn.guessing).toEqual({ results: [], right: 0, leaderboard: [] });
    expect(code(await advance(ann, at, 'last')), 'the turn ends after the Santa').toBe('EDITION_CHANGED');
    for (const p of people) expect(ok(await p.trpc.query('giftday.get', at)).guessing).toEqual({ results: [], right: 0, leaderboard: [] });
    expect(ok(await first.trpc.query('guess.mine', at))!.result).toBeNull();
  });

  await test.step("then everyone sees whose Santa it was and the guess; back hides it", async () => {
    ok(await advance(ann, at, 'vote'));
    ok(await advance(ann, at, 'tally'));
    const shown = ok(await advance(ann, at, 'santa'));
    const result = {
      memberId: idOf(first),
      giftee: nameOf(idOf(first)),
      santa: nameOf(idOf(santaOf(first))),
      guess: first === bob ? nameOf(idOf(bobsSanta)) : first === cee ? nameOf(idOf(ceesWrong)) : null,
      right: first === bob,
    };
    expect(shown.unwrapOrder!.santaToShow).toBe(false);
    expect(shown.guessing).toMatchObject({ results: [result], right: first === bob ? 1 : 0 });
    expect(ok(await dan.trpc.query('giftday.get', at)).guessing!.results).toEqual([result]);
    expect(ok(await first.trpc.query('guess.mine', at))!.result).toEqual({ santa: result.santa, right: result.right });
    expect(code(await ann.trpc.mutate('manage.backToShopping', { ...at, giftDayDate: '2099-12-23' }))).toBe('GIFT_DAY_UNDERWAY');
    ok(await advance(ann, at, 'back'));
    expect(ok(await dan.trpc.query('giftday.get', at)).guessing!.results).toEqual([]);
    ok(await advance(ann, at, 'santa'));
    ok(await advance(ann, at, 'last'));
    expect(ok(await ann.trpc.query('giftday.presenter', at)).unwrapOrder).toMatchObject({ turnsTaken: 1, santaToShow: false });
    // Only the person whose turn it was is out.
    expect(ok(await ann.trpc.query('giftday.get', at)).guessing!.results.map((r) => r.memberId)).toEqual([idOf(first)]);
  });

  await test.step('the big reveal is the scoreboard: every pair, every guess, how many were right', async () => {
    ok(await ann.trpc.mutate('giftday.setReveal', { ...at, enabled: true }));
    ok(await ann.trpc.mutate('giftday.reveal', at));
    const { guessing, reveal } = ok(await cee.trpc.query('giftday.get', at));
    expect(guessing!.results).toHaveLength(4);
    expect(guessing!.right).toBe(1);
    expect(guessing!.results.find((r) => r.memberId === idOf(bob))).toMatchObject({ right: true, guess: nameOf(idOf(bobsSanta)) });
    expect(guessing!.results.find((r) => r.memberId === idOf(cee))).toMatchObject({ right: false, guess: nameOf(idOf(ceesWrong)) });
    expect(guessing!.results.find((r) => r.memberId === idOf(dan))).toMatchObject({ right: false, guess: null });
    expect(guessing!.results.map(({ giftee, santa }) => ({ giftee, santa }))).toEqual(reveal.pairs);
    expect(ok(await cee.trpc.query('guess.mine', at))!.result).toEqual({ santa: nameOf(idOf(santaOf(cee))), right: false });
  });
});

test('organizer switch: off hides every guess and keeps Santas out of the turns', async ({ signIn, db }) => {
  const people = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const [ann, bob] = people;
  const group = await drawnGroup(people, 'No guessing');
  const at = { groupSlug: group.slug, editionNumber: 1 };
  const { idOf } = await peopleOf(db, group.slug, people);
  ok(await bob.trpc.mutate('guess.make', { ...at, memberId: idOf(ann) }));

  expect(code(await bob.trpc.mutate('guess.setEnabled', { ...at, enabled: false }))).toBe('NOT_ORGANIZER');
  expect(ok(await ann.trpc.query('group.get', { groupSlug: group.slug })).edition!.guessing).toBe(true);
  ok(await ann.trpc.mutate('guess.setEnabled', { ...at, enabled: false }));
  expect(ok(await ann.trpc.query('group.get', { groupSlug: group.slug })).edition!.guessing).toBe(false);
  expect(ok(await bob.trpc.query('guess.mine', at))).toBeNull();
  expect(code(await people[2].trpc.mutate('guess.make', { ...at, memberId: idOf(ann) }))).toBe('GUESSING_CLOSED');

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
  expect(ok(await bob.trpc.query('guess.mine', at))!.guess?.memberId).toBe(idOf(ann));
});

test('re-draw and removal drop guesses, a late joiner keeps them; account deletion removes mine and those naming me', async ({ signIn, db }) => {
  const people = await Promise.all(['ann', 'bob', 'cee', 'dan'].map((name) => signIn(name)));
  const [ann, bob, cee, dan] = people;
  const group = await drawnGroup(people, 'Guess changes');
  const at = { groupSlug: group.slug, editionNumber: 1 };
  const { idOf } = await peopleOf(db, group.slug, people);
  const editionId = (await editionOf(db, group.slug))._id;
  const guessers = async () => (await db.guesses.find({ editionId }).toArray()).map((g) => g.guesserMemberId).toSorted();

  ok(await bob.trpc.mutate('guess.make', { ...at, memberId: idOf(cee) }));
  ok(await cee.trpc.mutate('guess.make', { ...at, memberId: idOf(dan) }));
  ok(await dan.trpc.mutate('guess.make', { ...at, memberId: idOf(bob) }));

  await test.step('a late joiner slots in: guesses stay', async () => {
    const eve = await signIn('eve');
    ok(await eve.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name: 'Eve' }));
    expect(Object.keys((await editionOf(db, group.slug)).draw!.assignments)).toHaveLength(5);
    expect(await guessers()).toEqual([bob, cee, dan].map(idOf).toSorted());
  });

  await test.step('removing Dan drops his guess and the one naming him', async () => {
    ok(await ann.trpc.mutate('settings.removePerson', { groupSlug: group.slug, memberId: idOf(dan) }));
    expect(await guessers()).toEqual([idOf(bob)]);
    expect(ok(await cee.trpc.query('guess.mine', at))!.open).toBe(true);
  });

  await test.step("account deletion: Bob's guess and the one naming him go", async () => {
    ok(await cee.trpc.mutate('guess.make', { ...at, memberId: idOf(bob) }));
    const before = (await mailsTo(bob.email)).filter((mail) => mail.tags.length === 0).length;
    ok(await bob.trpc.mutate('account.requestDeletion'));
    let mails = await mailsTo(bob.email);
    await expect.poll(async () => (mails = (await mailsTo(bob.email)).filter((mail) => mail.tags.length === 0)).length).toBe(before + 1);
    ok(await bob.trpc.mutate('account.delete', { code: mails.at(-1)!.text.match(/\b(\d{6})\b/)![1] }));
    expect(await db.guesses.countDocuments({ editionId })).toBe(0);
  });

  await test.step('a re-draw starts the guessing over', async () => {
    ok(await cee.trpc.mutate('guess.make', { ...at, memberId: idOf(ann) }));
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
    ok(await advance(ann, at, 'vote'));
    ok(await advance(ann, at, 'tally'));
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
