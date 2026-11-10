// "I've got my gift" (63): ticks call Dibs!, Dibs! come pre-checked, free-text lines, undo; private to
// the Santa (the giftee never sees it, the organizer only who's still shopping); gift counts from gift
// day on drive the one-by-one turns.
import { newId } from '@/lib/server/db';
import { expect, ok, test, type User } from '../fixtures';
import { code, drawnGroup, editionOf } from './s6-helpers';

const memberOf = async (db: Parameters<typeof editionOf>[0], slug: string) => {
  const group = (await db.groups.findOne({ slug }))!;
  return { group, idOf: (user: User) => group.members.find((m) => m.userId === user.id)!.id };
};

test('mark what I got: ticks claim, Dibs! pre-checked, lines, undo; giftee and organizer never see what', async ({ signIn, db }) => {
  const people = await Promise.all(['ann', 'bob', 'cee', 'dan'].map((name) => signIn(name)));
  const [ann] = people;
  const group = await drawnGroup(people, 'Gifts');
  const at = { groupSlug: group.slug, editionNumber: 1 };
  const edition = await editionOf(db, group.slug);
  const { group: doc, idOf } = await memberOf(db, group.slug);
  // A Santa and giftee who are both not the organizer.
  const [santaId, gifteeId] = Object.entries(edition.draw!.assignments).find(([s, g]) => s !== idOf(ann) && g !== idOf(ann))!;
  const santa = people.find((p) => idOf(p) === santaId)!;
  const giftee = people.find((p) => idOf(p) === gifteeId)!;
  const santaName = doc.members.find((m) => m.id === santaId)!.name;
  const wishIds: string[] = [];
  for (const title of ['Moomin mug', 'Green socks', 'A good novel']) wishIds.push(ok(await giftee.trpc.mutate('wish.create', { title })).id);
  const [w1, w2, w3] = wishIds;
  // Someone in another group has Dibs! on the socks.
  await db.claims.insertOne({ _id: newId(), wishId: w2, ownerId: giftee.id, editionId: newId(), santaMemberId: newId(), createdAt: new Date() });
  const secrets = ['Concert tickets', 'A scarf'];

  await test.step('Dibs! come pre-checked until something is marked', async () => {
    ok(await santa.trpc.mutate('claim.add', { ...at, wishId: w1 }));
    expect(ok(await santa.trpc.query('gift.mine', at))).toEqual({ marked: false, wishIds: [w1], lines: [] });
  });

  await test.step("ticking calls Dibs!; someone else's Dibs! can't be ticked", async () => {
    expect(code(await santa.trpc.mutate('gift.set', { ...at, wishIds: [w1, w2], lines: [] }))).toBe('WISH_TAKEN');
    expect(code(await santa.trpc.mutate('gift.set', { ...at, wishIds: [newId()], lines: [] }))).toBe('NOT_FOUND');
    ok(await santa.trpc.mutate('gift.set', { ...at, wishIds: [w1, w3], lines: secrets }));
    expect(ok(await santa.trpc.query('gift.mine', at))).toEqual({ marked: true, wishIds: [w1, w3], lines: secrets });
    const claims = ok(await santa.trpc.query('claim.gifteeWishlist', at))!.wishes.map((wish) => wish.claim);
    expect(claims).toEqual(['mine', 'taken', 'mine']);
  });

  await test.step('the giftee sees none of it, anywhere', async () => {
    const seen = JSON.stringify([
      ok(await giftee.trpc.query('wish.list')),
      ok(await giftee.trpc.query('wish.groupView', { groupSlug: group.slug })),
      ok(await giftee.trpc.query('claim.gifteeWishlist', at)),
      ok(await giftee.trpc.query('gift.mine', at)),
      ok(await giftee.trpc.query('gift.toOpen', at)),
      ok(await giftee.trpc.query('giftday.get', at)),
      ok(await giftee.trpc.query('account.groups')),
      ok(await giftee.trpc.query('account.export')),
    ]);
    for (const secret of secrets) expect(seen).not.toContain(secret);
    expect(ok(await giftee.trpc.query('gift.toOpen', at)).count, 'no count before gift day').toBeNull();
    expect(code(await giftee.trpc.query('gift.stillShopping', at))).toBe('NOT_ORGANIZER');
  });

  await test.step("the organizer sees who's still shopping: names only", async () => {
    const shopping = ok(await ann.trpc.query('gift.stillShopping', at))!;
    expect(Object.keys(shopping).toSorted()).toEqual(['santas', 'stillShopping']);
    expect(shopping.santas).toBe(4);
    expect(shopping.stillShopping).toHaveLength(3);
    expect(shopping.stillShopping).not.toContain(santaName);
    const seen = JSON.stringify([shopping, ok(await ann.trpc.query('group.get', { groupSlug: group.slug })), ok(await ann.trpc.query('giftday.presenter', at))]);
    for (const secret of [...secrets, 'Moomin mug']) expect(seen).not.toContain(secret);
  });

  await test.step('the Santa exports it; dropping a Dibs! unticks it; undo by unticking everything', async () => {
    expect(JSON.stringify(ok(await santa.trpc.query('account.export')).giftsMarked)).toContain('A scarf');
    ok(await santa.trpc.mutate('claim.remove', { ...at, wishId: w3 }));
    expect(ok(await santa.trpc.query('gift.mine', at)).wishIds).toEqual([w1]);
    ok(await santa.trpc.mutate('gift.set', { ...at, wishIds: [], lines: [] }));
    expect(ok(await santa.trpc.query('gift.mine', at))).toEqual({ marked: false, wishIds: [w1], lines: [] });
    expect(ok(await ann.trpc.query('gift.stillShopping', at))!.stillShopping).toContain(santaName);
    expect(await db.gifts.countDocuments({ editionId: edition._id })).toBe(0);
  });

  await test.step('closed after gift day', async () => {
    await db.editions.updateOne({ _id: edition._id }, { $set: { status: 'done' } });
    expect(code(await santa.trpc.mutate('gift.set', { ...at, wishIds: [], lines: ['Late'] }))).toBe('EDITION_CLOSED');
  });
});

test('gift counts from gift day: "gift 2 of 3", one by one ends by itself; unknown counts fall back to more / last', async ({ signIn, db }) => {
  const people = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const [ann] = people;
  const group = await drawnGroup(people, 'Counts');
  const at = { groupSlug: group.slug, editionNumber: 1 };
  ok(await ann.trpc.mutate('giftday.setMode', { ...at, mode: 'oneByOne' }));
  ok(await ann.trpc.mutate('giftday.shuffle', at));
  const presenter = async () => ok(await ann.trpc.query('giftday.presenter', at)).unwrapOrder!;
  const [a, b, c] = (await presenter()).people.map((p) => p.memberId);
  const edition = await editionOf(db, group.slug);
  const { idOf } = await memberOf(db, group.slug);
  const santaOf = (gifteeId: string) => people.find((p) => edition.draw!.assignments[idOf(p)] === gifteeId)!;
  const personOf = (memberId: string) => people.find((p) => idOf(p) === memberId)!;
  // A gets 3 (lines), B 1, C's Santa marks nothing.
  ok(await santaOf(a).trpc.mutate('gift.set', { ...at, wishIds: [], lines: ['One', 'Two', 'Three'] }));
  ok(await santaOf(b).trpc.mutate('gift.set', { ...at, wishIds: [], lines: ['Only'] }));

  expect((await presenter()).people.map((p) => p.gifts), 'not before gift day').toEqual([null, null, null]);
  expect(ok(await personOf(a).trpc.query('gift.toOpen', at)).count).toBeNull();
  await db.editions.updateOne({ _id: edition._id }, { $set: { status: 'giftday' } });
  expect((await presenter()).people.map((p) => p.gifts)).toEqual([3, 1, null]);
  expect(ok(await personOf(a).trpc.query('gift.toOpen', at)).count).toBe(3);
  expect(ok(await personOf(c).trpc.query('gift.toOpen', at)).count).toBeNull();

  const advance = async (action: 'start' | 'spin' | 'more' | 'last') =>
    ok(await ann.trpc.mutate('giftday.advance', { ...at, action, turnsTaken: (await presenter()).turnsTaken }));
  await advance('start');
  const seen: string[] = [];
  let cGifts = 2;
  for (let i = 0; i < 10; i++) {
    let order = await presenter();
    if (order.finished) break;
    if (!order.currentShown) {
      await advance('spin');
      order = await presenter();
    }
    const current = order.current!.memberId;
    seen.push(`${current === a ? 'A' : current === b ? 'B' : 'C'}${order.currentGift}`);
    // Known counts: the presenter only says "next" ('more'). C by hand: more, then last.
    await advance(current === c && --cGifts === 0 ? 'last' : 'more');
  }
  expect(seen).toEqual(['A1', 'B1', 'C1', 'A2', 'C2', 'A3']);
  const end = await presenter();
  expect(end.finished).toBe(true);
  expect(end.people.map((p) => p.done)).toEqual([true, true, true]);
});
