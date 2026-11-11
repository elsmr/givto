// White elephant steals (89): the presenter's open / steal / final swap, the rules enforced by giftday.advance, the
// table on phones.
import { expect, ok, test, type User } from '../fixtures';
import { code, drawnGroup } from './s6-helpers';

type Action = 'start' | 'spin' | 'open' | 'steal' | 'keep' | 'back' | 'more' | 'last';

test('white elephant: open, steal, frozen gifts, no steal-back, final swap; refused when illegal or stale', async ({ signIn }) => {
  const [ann, bob, cee, dan] = await Promise.all(['ann', 'bob', 'cee', 'dan'].map((name) => signIn(name)));
  const group = ok(
    await ann.trpc.mutate('group.create', {
      name: 'Steals',
      organizerName: 'Ann',
      timeZone: 'Europe/Brussels',
      giftDay: { date: '2099-12-24' },
      exchangeMode: 'inPerson',
      kind: 'whiteElephant',
    })
  );
  const at = { groupSlug: group.slug, editionNumber: 1 };
  for (const [user, name] of [[bob, 'Bob'], [cee, 'Cee'], [dan, 'Dan']] as const) {
    ok(await user.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name }));
  }
  ok(await ann.trpc.mutate('draw.lockIn', at));
  ok(await ann.trpc.mutate('manage.startGiftDay', at));
  let view = ok(await ann.trpc.query('giftday.presenter', at));
  const [p0, p1, p2, p3] = view.unwrapOrder!.people.map((p) => p.memberId);
  const send = (action: Action, extra: { giftNo?: number; label?: string } = {}, by: User = ann) =>
    by.trpc.mutate('giftday.advance', { ...at, action, turnsTaken: view.unwrapOrder!.turnsTaken, ...extra });
  const advance = async (action: Action, extra?: { giftNo?: number; label?: string }) => (view = ok(await send(action, extra)));
  const up = () => view.unwrapOrder!.current?.memberId;
  const holders = () => Object.fromEntries(view.swap!.gifts.map((gift) => [gift.no, gift.holder.memberId]));

  await test.step('open: the turn moves on with a spin; Secret Santa steps are refused', async () => {
    await advance('start');
    expect(code(await send('more'))).toBe('FORBIDDEN');
    await advance('spin');
    expect(up()).toBe(p0);
    expect(view.swap).toMatchObject({ gifts: [], wrapped: 4, stealable: [], final: false });
    expect(code(await send('steal', { giftNo: 1 }))).toBe('FORBIDDEN');
    expect(code(await send('open', {}, bob))).toBe('NOT_ORGANIZER');
    await advance('open', { label: 'Red scarf' });
    expect(view.unwrapOrder!.currentShown).toBe(false);
    await advance('spin');
    expect(up()).toBe(p1);
  });

  await test.step('steal: the person robbed goes next without a spin, and not straight back', async () => {
    await advance('steal', { giftNo: 1 });
    expect(up()).toBe(p0);
    expect(view.unwrapOrder!.currentShown).toBe(true);
    expect(view.swap).toMatchObject({ robbed: true, stealable: [] });
    expect(view.swap!.gifts[0]).toMatchObject({ no: 1, label: 'Red scarf', holder: { memberId: p1 }, steals: 1, frozen: false });
    expect(code(await send('steal', { giftNo: 1 }))).toBe('FORBIDDEN');
    await advance('open');
    await advance('spin');
    expect(up()).toBe(p2);
  });

  await test.step('a chain of steals; the third steal freezes a gift', async () => {
    await advance('steal', { giftNo: 1 });
    expect(up()).toBe(p1);
    await advance('steal', { giftNo: 2 });
    expect(up()).toBe(p0);
    expect(view.swap!.stealable).toEqual([1]);
    await advance('steal', { giftNo: 1 });
    expect(view.swap!.gifts[0]).toMatchObject({ holder: { memberId: p0 }, steals: 3, frozen: true });
    expect(up()).toBe(p2);
    expect(view.swap!.stealable).toEqual([2]);
    await advance('open');
    // The last one in the order: no reel.
    expect(view.unwrapOrder!.currentShown).toBe(true);
    expect(up()).toBe(p3);
    expect(code(await send('steal', { giftNo: 1 }))).toBe('FORBIDDEN');
    expect(code(await send('keep'))).toBe('FORBIDDEN');
    await advance('open');
  });

  await test.step('the first player gets the final steal; stale steps are refused; back undoes', async () => {
    expect(up()).toBe(p0);
    expect(view.swap).toMatchObject({ final: true, wrapped: 0, stealable: [2, 3, 4] });
    expect(view.unwrapOrder!.currentShown).toBe(true);
    expect(code(await send('open'))).toBe('FORBIDDEN');
    expect(code(await send('steal', { giftNo: 1 }))).toBe('FORBIDDEN');
    expect(code(await ann.trpc.mutate('giftday.advance', { ...at, action: 'steal', giftNo: 2, turnsTaken: 3 }))).toBe('EDITION_CHANGED');
    await advance('back');
    expect(up()).toBe(p3);
    expect(view.swap!.wrapped).toBe(1);
    await advance('open');
    await advance('steal', { giftNo: 4 });
    expect(view.unwrapOrder!.finished).toBe(true);
    expect(holders()).toEqual({ 1: p3, 2: p1, 3: p2, 4: p0 });
    expect(code(await send('keep'))).toBe('FORBIDDEN');
  });

  await test.step('phones see the same table, without what may be stolen', async () => {
    const phone = ok(await bob.trpc.query('giftday.get', at));
    const { stealable, ...table } = view.swap!;
    expect(stealable).toEqual([]);
    expect(phone.swap).toEqual(table);
    expect(phone.unwrapOrder!.finished).toBe(true);
  });
});

test('white elephant: keep ends the game; no back to shopping once a gift is open; Secret Santa refuses swap steps', async ({ signIn }) => {
  const [ann, bob, cee] = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const santa = await drawnGroup([ann, bob, cee], 'Santa');
  const at = { groupSlug: santa.slug, editionNumber: 1 };
  ok(await ann.trpc.mutate('manage.startGiftDay', at));
  ok(await ann.trpc.mutate('giftday.advance', { ...at, action: 'start', turnsTaken: 0 }));
  for (const action of ['open', 'steal', 'keep'] as const) {
    expect(code(await ann.trpc.mutate('giftday.advance', { ...at, action, giftNo: 1, turnsTaken: 0 }))).toBe('FORBIDDEN');
  }

  const swap = ok(
    await ann.trpc.mutate('group.create', {
      name: 'Keep',
      organizerName: 'Ann',
      timeZone: 'Europe/Brussels',
      giftDay: { date: '2099-12-24' },
      exchangeMode: 'inPerson',
      kind: 'whiteElephant',
    })
  );
  const we = { groupSlug: swap.slug, editionNumber: 1 };
  for (const [user, name] of [[bob, 'Bob'], [cee, 'Cee']] as const) {
    ok(await user.trpc.mutate('join.accept', { groupSlug: swap.slug, token: swap.joinToken, name }));
  }
  ok(await ann.trpc.mutate('draw.lockIn', we));
  ok(await ann.trpc.mutate('manage.startGiftDay', we));
  let turnsTaken = 0;
  const step = async (action: 'start' | 'open' | 'keep') => {
    const view = ok(await ann.trpc.mutate('giftday.advance', { ...we, action, turnsTaken }));
    turnsTaken = view.unwrapOrder!.turnsTaken;
    return view;
  };
  await step('start');
  await step('open');
  expect(code(await ann.trpc.mutate('manage.backToShopping', { ...we, giftDayDate: '2099-12-30' }))).toBe('GIFT_DAY_UNDERWAY');
  for (let i = 0; i < 2; i++) await step('open');
  const end = await step('keep');
  expect(end.unwrapOrder!.finished).toBe(true);
  expect(end.swap!.gifts.map((gift) => gift.steals)).toEqual([0, 0, 0]);
});
