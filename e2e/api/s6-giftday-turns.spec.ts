// Gift day (part 2; 31, 32): turns one by one, the gift day job, status by
// the edition's local date. Part 1: s6-giftday.spec.ts.
import { expect, ok, runCron, test } from '../fixtures';
import { code, drawnGroup, editionOf } from './s6-helpers';

test('one by one: A 3 gifts, B 1, C 2 → A,B,C,A,C,A; stored, the same for everyone, organizer-only', async ({ signIn, db }) => {
  const [ann, bob, cee] = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const trio = await drawnGroup([ann, bob, cee], 'Trio');
  const at = { groupSlug: trio.slug, editionNumber: 1 };
  expect(code(await bob.trpc.mutate('giftday.setMode', { ...at, mode: 'oneByOne' }))).toBe('NOT_ORGANIZER');
  ok(await ann.trpc.mutate('giftday.setMode', { ...at, mode: 'oneByOne' }));
  ok(await ann.trpc.mutate('giftday.shuffle', at));
  const presenter = async () => ok(await ann.trpc.query('giftday.presenter', at)).unwrapOrder!;
  const [a, b, c] = (await presenter()).people.map((p) => p.memberId);
  const gifts = { [a]: 3, [b]: 1, [c]: 2 };
  const advance = async (action: 'start' | 'spin' | 'more' | 'last' | 'back', by = ann) => {
    const { turnsTaken } = await presenter();
    return by.trpc.mutate('giftday.advance', { ...at, action, turnsTaken });
  };
  expect(code(await advance('start', bob))).toBe('NOT_ORGANIZER');
  ok(await advance('start'));
  expect(code(await ann.trpc.mutate('giftday.advance', { ...at, action: 'start', turnsTaken: 0 }))).toBe('EDITION_CHANGED');
  const seen: string[] = [];
  for (let i = 0; i < 10; i++) {
    let order = await presenter();
    if (order.finished) break;
    // Before the reel lands nobody else sees whose turn it is; after, everyone sees the same.
    if (!order.currentShown) {
      expect(ok(await bob.trpc.query('giftday.get', at)).unwrapOrder!.current).toBeNull();
      ok(await advance('spin'));
      order = await presenter();
    }
    const views = await Promise.all([bob, cee].map(async (p) => ok(await p.trpc.query('giftday.get', at)).unwrapOrder!));
    expect(views[0]).toEqual(views[1]);
    expect(views[0].went.map((p) => p.memberId)).toEqual([...new Set(seen)]);
    for (const view of views) expect(view.current!.memberId).toBe(order.current!.memberId);
    const current = order.current!.memberId;
    seen.push(current);
    gifts[current]--;
    expect(code(await advance(gifts[current] > 0 ? 'more' : 'last', bob))).toBe('NOT_ORGANIZER');
    if (i === 2) {
      // A refresh (a fresh read) keeps the position, and a stale step is refused.
      expect((await presenter()).current!.memberId).toBe(current);
      expect(code(await ann.trpc.mutate('giftday.advance', { ...at, action: 'more', turnsTaken: 0 }))).toBe('EDITION_CHANGED');
    }
    ok(await advance(gifts[current] > 0 ? 'more' : 'last'));
    if (seen.length === 5) expect((await presenter()).currentShown, 'one person left: no spin').toBe(true);
  }
  expect(seen).toEqual([a, b, c, a, c, a]);
  const end = await presenter();
  expect(end.finished).toBe(true);
  expect(end.people.map((p) => p.done)).toEqual([true, true, true]);

  ok(await advance('back'));
  expect((await presenter()).current!.memberId).toBe(a);
  ok(await ann.trpc.mutate('giftday.shuffle', at));
  const reset = await presenter();
  expect(reset.started).toBe(false);
  expect((await editionOf(db, trio.slug)).unwrapOrder!.progress).toBeUndefined();

  ok(await ann.trpc.mutate('giftday.setMode', { ...at, mode: 'allAtOnce' }));
  ok(await advance('start'));
  const once: string[] = [];
  for (let order = await presenter(); !order.finished; order = await presenter()) {
    if (!order.currentShown) ok(await advance('spin'));
    once.push((await presenter()).current!.memberId);
    ok(await advance('more'));
  }
  expect(once).toEqual(reset.people.map((p) => p.memberId));
});

test('the cron endpoint runs the gift day job', async () => {
  const { status, body } = await runCron('giftday');
  expect(status, JSON.stringify(body)).toBe(200);
  expect(Array.isArray(body.result.giftday) && Array.isArray(body.result.done), JSON.stringify(body)).toBe(true);
});

test('status follows the local date: Auckland (ahead of UTC) and Los Angeles (behind)', async ({ signIn, db }) => {
  const people = await Promise.all(['ann', 'bob', 'cee', 'dan'].map((name) => signIn(name)));
  // 2099-12-24 is gift day in both. Auckland is UTC+13 in December, Los Angeles UTC−8.
  const auckland = (await drawnGroup(people, 'Auckland', { timeZone: 'Pacific/Auckland' })).slug;
  const losAngeles = (await drawnGroup(people, 'Los Angeles', { timeZone: 'America/Los_Angeles' })).slug;
  // Same gift day, left out of `editionIds`: the scoped trigger never moves it.
  const bystander = (await drawnGroup(people, 'Bystander')).slug;
  const idsOf = (slugs: string[]) => Promise.all(slugs.map(async (slug) => (await editionOf(db, slug))._id));
  const editionIds = await idsOf([auckland, losAngeles]);
  const runAt = async (now: string, ids = editionIds) => ok(await people[0].trpc.mutate('giftday.runDue', { now, editionIds: ids }));
  const statuses = async () => [(await editionOf(db, auckland)).status, (await editionOf(db, losAngeles)).status];

  await runAt('2099-12-23T10:00:00.000Z'); // Auckland 23rd 23:00, LA 23rd 02:00
  expect(await statuses()).toEqual(['drawn', 'drawn']);
  const moved = await runAt('2099-12-23T11:30:00.000Z'); // Auckland 24th 00:30, LA 23rd 03:30
  expect(await statuses()).toEqual(['giftday', 'drawn']);
  const entered = await editionOf(db, auckland);
  expect(moved.giftday).toContain(entered._id);
  expect(entered.statusChangedAt.giftday).toBeTruthy();
  expect(entered.unwrapOrder!.memberIds.toSorted()).toEqual(Object.keys(entered.draw!.assignments).toSorted());
  expect((await runAt('2099-12-23T11:30:00.000Z')).giftday, 'not idempotent').toEqual([]);

  await runAt('2099-12-24T08:30:00.000Z'); // Auckland 24th 21:30, LA 24th 00:30
  expect(await statuses()).toEqual(['giftday', 'giftday']);
  await runAt('2099-12-24T11:30:00.000Z'); // Auckland 25th 00:30, LA 24th 03:30
  expect(await statuses()).toEqual(['done', 'giftday']);
  await runAt('2099-12-25T07:30:00.000Z'); // UTC is on the 25th, LA still 24th 23:30
  expect(await statuses()).toEqual(['done', 'giftday']);
  await runAt('2099-12-25T08:30:00.000Z'); // LA 25th 00:30
  expect(await statuses()).toEqual(['done', 'done']);

  // A day missed entirely (cron down): drawn goes straight to done.
  const missed = (await drawnGroup(people, 'Missed', { date: '2099-12-20' })).slug;
  await runAt('2099-12-25T08:30:00.000Z', await idsOf([missed]));
  expect((await editionOf(db, missed)).status).toBe('done');
  expect((await editionOf(db, bystander)).status, 'outside editionIds').toBe('drawn');
});
