// The unwrap order stays a surprise (was tests/smoke-z2.mjs, 32): on gift day members only learn
// who's unwrapping now and who already went; the organizer's presenter view keeps the full order.
import { expect, ok, test, type User } from '../fixtures';

test('the unwrap order stays a surprise for members', async ({ signIn, db }) => {
  const [ann, bob, cee, dan] = await Promise.all(['z2ann', 'z2bob', 'z2cee', 'z2dan'].map((name) => signIn(name)));
  const group = ok(
    await ann.trpc.mutate('group.create', {
      name: 'Surprise',
      organizerName: 'Ann',
      timeZone: 'Europe/Brussels',
      giftDay: { date: '2099-12-24' },
      exchangeMode: 'inPerson',
    })
  );
  for (const [person, name] of [[bob, 'Bob'], [cee, 'Cee'], [dan, 'Dan']] as const) {
    ok(await person.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name }));
  }
  const at = { groupSlug: group.slug, editionNumber: 1 };
  ok(await ann.trpc.mutate('draw.run', at));
  ok(await ann.trpc.mutate('giftday.shuffle', at));
  const { _id: groupId } = (await db.groups.findOne({ slug: group.slug }))!;
  await db.editions.updateOne({ groupId, number: 1 }, { $set: { status: 'giftday' } });

  const presenter = async () => ok(await ann.trpc.query('giftday.presenter', at)).unwrapOrder!;
  const advance = async (action: 'start' | 'spin' | 'more') =>
    ok(await ann.trpc.mutate('giftday.advance', { ...at, action, turnsTaken: (await presenter()).turnsTaken }));
  const giftdayView = async (person: User) => ok(await person.trpc.query('giftday.get', at));
  const order = (await presenter()).people.map((p) => p.memberId);

  /** Nobody's `giftday.get` (organizer included) names anyone who hasn't unwrapped yet, apart from who's on now. */
  const expectNoFutureOrder = async (shownIds: string[]) => {
    for (const person of [ann, bob, cee, dan]) {
      const view = await giftdayView(person);
      const text = JSON.stringify(view);
      for (const memberId of order.filter((id) => !shownIds.includes(id))) {
        expect(text, 'giftday.get leaks a future turn').not.toContain(memberId);
      }
      const unwrapOrder = view.unwrapOrder as Record<string, unknown>;
      expect(unwrapOrder.next, 'giftday.get names who is up next').toBeUndefined();
      expect(unwrapOrder.people, 'giftday.get lists the whole order').toBeUndefined();
    }
  };

  await test.step('presenter keeps the full order on gift day', async () => {
    expect(order).toHaveLength(4);
  });

  await test.step('before the start members see no order at all', async () => {
    await expectNoFutureOrder([]);
    const view = (await giftdayView(bob)).unwrapOrder!;
    expect(view.went).toEqual([]);
    expect(view.current).toBeNull();
  });

  await test.step('during the unwrapping: who is on now and who already went, nothing ahead', async () => {
    await advance('start');
    await expectNoFutureOrder([]);
    await advance('spin');
    await expectNoFutureOrder([order[0]]);
    expect((await giftdayView(cee)).unwrapOrder!.current!.memberId).toBe(order[0]);
    await advance('more');
    await expectNoFutureOrder([order[0]]);
    await advance('spin');
    await expectNoFutureOrder([order[0], order[1]]);
    const view = (await giftdayView(dan)).unwrapOrder!;
    expect(view.went.map((p) => p.memberId)).toEqual([order[0]]);
    expect(view.went[0].done).toBe(true);
    expect(view.current!.memberId).toBe(order[1]);
  });

  await test.step('the big reveal does not list the pairs in unwrap order for members', async () => {
    ok(await ann.trpc.mutate('giftday.setReveal', { ...at, enabled: true }));
    ok(await ann.trpc.mutate('giftday.reveal', at));
    const giftees = (await giftdayView(bob)).reveal.pairs!.map((p) => p.giftee);
    expect(giftees).toEqual(giftees.toSorted((a, b) => a.localeCompare(b)));
  });
});
