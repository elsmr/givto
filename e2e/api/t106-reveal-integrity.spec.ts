import { expect, ok, test, type User } from '../fixtures';
import { code, drawnGroup, memberIdOf, presenterSaw } from './s6-helpers';

type Input = { groupSlug: string; editionNumber: number };

const advance = async (ann: User, at: Input, action: 'start' | 'spin' | 'santa' | 'back') => {
  const view = ok(await ann.trpc.query('giftday.presenter', at));
  return ann.trpc.mutate('giftday.advance', { ...at, action, ...presenterSaw(view.unwrapOrder!) });
};

const showFirstSanta = async (ann: User, at: Input) => {
  ok(await advance(ann, at, 'start'));
  ok(await advance(ann, at, 'spin'));
  ok(await advance(ann, at, 'santa'));
  return ok(await ann.trpc.query('giftday.presenter', at)).unwrapOrder!.current!.memberId;
};

const rowsOpen = async (people: User[], at: Input, gifteeId: string) =>
  (await Promise.all(people.map(async (p) => ok(await p.trpc.query('guess.get', at))!.rows.find((row) => row.memberId === gifteeId))))
    .filter((row) => row !== undefined)
    .map((row) => row.open);

test("a Santa shown at a turn stays out: Previous, another mode or a reshuffle don't reopen guesses or go back to shopping", async ({ signIn }) => {
  const people = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const [ann, bob] = people;
  const group = await drawnGroup(people, 'Stays shown');
  const at = { groupSlug: group.slug, editionNumber: 1 };
  const back = () => ann.trpc.mutate('manage.backToShopping', { ...at, giftDayDate: '2099-12-23' });
  const results = async () => ok(await bob.trpc.query('giftday.get', at)).guessing!.results.map((r) => r.memberId);
  ok(await ann.trpc.mutate('manage.startGiftDay', at));
  const shown = await showFirstSanta(ann, at);

  const undo: [string, () => Promise<unknown>][] = [
    ['Previous on the Santa slide', async () => ok(await advance(ann, at, 'back'))],
    ['another unwrap mode', async () => ok(await ann.trpc.mutate('giftday.setMode', { ...at, mode: 'oneByOne' }))],
    ['a reshuffle', async () => ok(await ann.trpc.mutate('giftday.shuffle', at))],
  ];
  for (const [step, run] of undo) {
    await run();
    expect(await rowsOpen(people, at, shown), step).toEqual([false, false]);
    expect(await results(), step).toEqual([shown]);
    expect(code(await back()), step).toBe('GIFT_DAY_UNDERWAY');
  }
});

test('the big reveal stays out: switched off, or reopened after a done edition showed it', async ({ signIn }) => {
  const people = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const [ann, bob] = people;
  const back = (at: Input) => ann.trpc.mutate('manage.backToShopping', { ...at, giftDayDate: '2099-12-23' });
  const anyOpen = async (at: Input) => ok(await bob.trpc.query('guess.get', at))!.rows.some((row) => row.open);

  await test.step('revealed, then switched off', async () => {
    const group = await drawnGroup(people, 'Switched off');
    const at = { groupSlug: group.slug, editionNumber: 1 };
    ok(await ann.trpc.mutate('manage.startGiftDay', at));
    ok(await ann.trpc.mutate('giftday.setReveal', { ...at, enabled: true }));
    ok(await ann.trpc.mutate('giftday.reveal', at));
    ok(await ann.trpc.mutate('giftday.setReveal', { ...at, enabled: false }));
    expect(await anyOpen(at)).toBe(false);
    expect(code(await back(at))).toBe('GIFT_DAY_UNDERWAY');
  });

  await test.step('done with the reveal on, then reopened', async () => {
    const group = await drawnGroup(people, 'Reopened');
    const at = { groupSlug: group.slug, editionNumber: 1 };
    ok(await ann.trpc.mutate('giftday.setReveal', { ...at, enabled: true }));
    ok(await ann.trpc.mutate('manage.startGiftDay', at));
    ok(await ann.trpc.mutate('manage.finishGiftDay', at));
    expect(ok(await bob.trpc.query('giftday.get', at)).reveal.pairs).toHaveLength(3);
    ok(await ann.trpc.mutate('manage.reopenGiftDay', at));
    expect(ok(await bob.trpc.query('giftday.get', at)).reveal.pairs).toHaveLength(3);
    expect(await anyOpen(at)).toBe(false);
    expect(code(await back(at))).toBe('GIFT_DAY_UNDERWAY');
  });

  await test.step('done with the reveal on, switched off, then reopened', async () => {
    const group = await drawnGroup(people, 'Off after done');
    const at = { groupSlug: group.slug, editionNumber: 1 };
    ok(await ann.trpc.mutate('giftday.setReveal', { ...at, enabled: true }));
    ok(await ann.trpc.mutate('manage.startGiftDay', at));
    ok(await ann.trpc.mutate('manage.finishGiftDay', at));
    ok(await ann.trpc.mutate('giftday.setReveal', { ...at, enabled: false }));
    ok(await ann.trpc.mutate('manage.reopenGiftDay', at));
    expect(await anyOpen(at)).toBe(false);
    expect(code(await back(at))).toBe('GIFT_DAY_UNDERWAY');
  });
});

test('done without the big reveal: only the Santas shown at turns, and only for people who were in it', async ({ signIn, db }) => {
  const [ann, bob, cee, dan, eve] = await Promise.all(['ann', 'bob', 'cee', 'dan', 'eve'].map((name) => signIn(name)));
  const group = ok(
    await ann.trpc.mutate('group.create', { name: 'Kept secret', organizerName: 'Ann', timeZone: 'Europe/Brussels', giftDay: { date: '2099-12-24' }, exchangeMode: 'inPerson' })
  );
  for (const [person, name] of [[bob, 'Bob'], [cee, 'Cee'], [dan, 'Dan'], [eve, 'Eve']] as const) {
    ok(await person.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name }));
  }
  const at = { groupSlug: group.slug, editionNumber: 1 };
  const [annId, bobId, ceeId, danId, eveId] = await Promise.all([ann, bob, cee, dan, eve].map((person) => memberIdOf(db, group.slug, person)));
  ok(await ann.trpc.mutate('settings.setParticipants', { ...at, memberIds: [annId, bobId, ceeId, danId] }));
  ok(await ann.trpc.mutate('settings.setOrganizer', { groupSlug: group.slug, memberId: eveId, organizer: true }));
  ok(await ann.trpc.mutate('draw.run', at));
  ok(await ann.trpc.mutate('manage.startGiftDay', at));
  const shown = await showFirstSanta(ann, at);
  ok(await ann.trpc.mutate('manage.finishGiftDay', at));

  const done = ok(await bob.trpc.query('giftday.get', at));
  expect(done.reveal.pairs).toBeNull();
  expect(done.guessing!.results.map((r) => r.memberId)).toEqual([shown]);
  const outside = ok(await eve.trpc.query('giftday.get', at));
  expect(outside.reveal.pairs).toBeNull();
  expect(outside.guessing).toBeNull();
  const presenterOutside = ok(await eve.trpc.query('giftday.presenter', at));
  expect(presenterOutside.reveal.pairs).toBeNull();
  expect(presenterOutside.guessing).toBeNull();

  ok(await ann.trpc.mutate('giftday.setReveal', { ...at, enabled: true }));
  expect(ok(await bob.trpc.query('giftday.get', at)).reveal.pairs).toHaveLength(4);
  const revealed = ok(await eve.trpc.query('giftday.get', at));
  expect(revealed.reveal.pairs, 'Eve sat this one out').toBeNull();
  expect(revealed.guessing).toBeNull();
  expect(ok(await ann.trpc.query('giftday.presenter', at)).reveal.pairs).toHaveLength(4);
  const revealedPresenter = ok(await eve.trpc.query('giftday.presenter', at));
  expect(revealedPresenter.reveal.pairs, 'Eve organizes but sat this one out').toBeNull();
  expect(revealedPresenter.guessing).toBeNull();
});
