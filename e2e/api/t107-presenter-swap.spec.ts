// 107: a presenter step is for the person the presenter showed, so someone leaving mid-turn can't hand their move to
// the next person; a White Elephant needs 3 people to start gift day.
import { expect, ok, test, type TestDb, type User } from '../fixtures';
import { code, drawnGroup, memberIdOf, presenterSaw } from './s6-helpers';

const whiteElephant = async ([ann, ...others]: User[], name: string) => {
  const group = ok(
    await ann.trpc.mutate('group.create', {
      name,
      organizerName: 'Ann',
      timeZone: 'Europe/Brussels',
      giftDay: { date: '2099-12-24' },
      exchangeMode: 'inPerson',
      kind: 'whiteElephant',
    })
  );
  for (const [i, user] of others.entries()) {
    ok(await user.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name: ['Bob', 'Cee', 'Dan'][i] }));
  }
  const at = { groupSlug: group.slug, editionNumber: 1 };
  ok(await ann.trpc.mutate('draw.lockIn', at));
  return at;
};

type Action = 'start' | 'spin' | 'open' | 'last';
type At = { groupSlug: string; editionNumber: number };

const presenterOrder = async (ann: User, at: At) => ok(await ann.trpc.query('giftday.presenter', at)).unwrapOrder!;

/** Ann's presenter steps on until someone else is up and on screen. */
const upNotAnn = async (db: TestDb, ann: User, at: At, people: User[], endTurn: Action) => {
  const send = async (action: Action) => ok(await ann.trpc.mutate('giftday.advance', { ...at, action, ...presenterSaw(await presenterOrder(ann, at)) }));
  const ids = await Promise.all(people.map((user) => memberIdOf(db, at.groupSlug, user)));
  await send('start');
  for (;;) {
    if (!(await presenterOrder(ann, at)).currentShown) await send('spin');
    const shown = await presenterOrder(ann, at);
    const up = people[ids.indexOf(shown.current!.memberId)];
    if (up !== ann) return { shown, up };
    await send(endTurn);
  }
};

test('White Elephant: once the person on screen leaves mid-turn, the next move for them is refused, not saved for someone else', async ({ signIn, db }) => {
  const people = await Promise.all(['ann', 'bob', 'cee', 'dan'].map((name) => signIn(name)));
  const [ann] = people;
  const at = await whiteElephant(people, 'Leaves mid-turn');
  ok(await ann.trpc.mutate('manage.startGiftDay', at));
  const { shown, up } = await upNotAnn(db, ann, at, people, 'open');

  ok(await up.trpc.mutate('membership.leave', { groupSlug: at.groupSlug }));
  expect(code(await ann.trpc.mutate('giftday.advance', { ...at, action: 'open', ...presenterSaw(shown) }))).toBe('EDITION_CHANGED');
  const after = await presenterOrder(ann, at);
  expect(after.turnsTaken).toBe(shown.turnsTaken);
  expect(after.current!.memberId).not.toBe(shown.current!.memberId);
});

test('Secret Santa: once the person on screen leaves mid-turn, ending their turn is refused', async ({ signIn, db }) => {
  const people = await Promise.all(['ann', 'bob', 'cee', 'dan'].map((name) => signIn(name)));
  const [ann] = people;
  const group = await drawnGroup(people, 'Santa leaves mid-turn');
  const at = { groupSlug: group.slug, editionNumber: 1 };
  // Guessing off: with it on, a turn can't end before the Santa is shown, which refuses `last` for another reason.
  ok(await ann.trpc.mutate('guess.setEnabled', { ...at, enabled: false }));
  ok(await ann.trpc.mutate('manage.startGiftDay', at));
  const { shown, up } = await upNotAnn(db, ann, at, people, 'last');

  ok(await up.trpc.mutate('membership.leave', { groupSlug: at.groupSlug }));
  expect(code(await ann.trpc.mutate('giftday.advance', { ...at, action: 'last', ...presenterSaw(shown) }))).toBe('EDITION_CHANGED');
  expect((await presenterOrder(ann, at)).turnsTaken).toBe(shown.turnsTaken);
});

test('White Elephant: gift day needs 3 people to start', async ({ signIn }) => {
  const people = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const [ann, bob] = people;
  const at = await whiteElephant(people, 'Too few on the day');
  ok(await bob.trpc.mutate('membership.leave', { groupSlug: at.groupSlug }));
  const refused = await ann.trpc.mutate('manage.startGiftDay', at);
  expect(code(refused)).toBe('TOO_FEW_PEOPLE');
  expect(refused.error!.data.details).toEqual({ min: 3 });
});
