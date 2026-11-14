// Edition history (100): a done edition keeps everyone's wishlist and the draw, whatever happens after.
import { expect, ok, test } from '../fixtures';
import { createGroup, join, memberIdOf } from './s4-group';

test('a done edition keeps its wishlists, people and draw', async ({ signIn, db }) => {
  const [ann, bob, cee, dan] = await Promise.all(['ann', 'bob', 'cee', 'dan'].map((name) => signIn(name)));
  const group = await createGroup(ann, 'History');
  for (const [person, name] of [[bob, 'Bob'], [cee, 'Cee']] as const) await join(person, group, name);
  const groupSlugs = [group.slug];
  const first = { groupSlug: group.slug, editionNumber: 1 };
  const teapot = ok(await ann.trpc.mutate('wish.create', { title: 'Teapot', groupSlugs }));
  const kite = ok(await bob.trpc.mutate('wish.create', { title: 'Kite', groupSlugs }));
  ok(await bob.trpc.mutate('wish.create', { title: 'Not here' }));
  ok(await ann.trpc.mutate('draw.run', first));
  const scarf = ok(await bob.trpc.mutate('wish.create', { title: 'Scarf', groupSlugs }));
  ok(await bob.trpc.mutate('giftday.markReceived', { wishId: scarf.id, received: true }));
  ok(await ann.trpc.mutate('manage.startGiftDay', first));
  ok(await ann.trpc.mutate('manage.finishGiftDay', first));

  ok(await bob.trpc.mutate('wish.update', { wishId: kite.id, title: 'Red kite' }));
  ok(await ann.trpc.mutate('wish.delete', { wishId: teapot.id }));
  ok(await ann.trpc.mutate('wish.create', { title: 'Lamp', groupSlugs }));
  ok(await ann.trpc.mutate('edition.startNext', { groupSlug: group.slug }));
  await join(dan, group, 'Dan');
  ok(await cee.trpc.mutate('membership.leave', { groupSlug: group.slug }));

  await test.step('everyone in it sees every list as it was; received during the edition counts', async () => {
    const view = ok(await bob.trpc.query('wish.editionLists', first));
    expect(view?.saved).toBe(true);
    expect(view?.lists.map(({ name, mine, wishes }) => [name, mine, wishes.map((wish) => wish.title)])).toEqual([
      ['Bob', true, ['Scarf', 'Kite']],
      ['Ann', false, ['Teapot']],
      ['Cee', false, []],
    ]);
    expect(ok(await dan.trpc.query('wish.editionLists', first)), 'Dan joined later').toBeNull();
    expect(ok(await ann.trpc.query('wish.editionLists', { groupSlug: group.slug, editionNumber: 2 })), 'not done').toBeNull();
  });

  await test.step('my giftee: their saved list, nothing to claim', async () => {
    const list = ok(await ann.trpc.query('claim.gifteeWishlist', first))!;
    expect(list.canClaim).toBe(false);
    expect(list.wishes.map((wish) => wish.title)).toEqual(list.giftee.name === 'Bob' ? ['Scarf', 'Kite'] : []);
  });

  await test.step('who gave to whom without the big reveal; Cee, who left, is still in it', async () => {
    const giftDay = ok(await ann.trpc.query('giftday.get', first));
    expect(giftDay.reveal.revealed).toBe(false);
    expect(giftDay.reveal.pairs?.map(({ giftee }) => giftee).toSorted()).toEqual(['Ann', 'Bob', 'Cee']);
    const past = ok(await bob.trpc.query('group.get', first));
    const ceeId = await memberIdOf(db, group.slug, cee);
    expect(past.edition?.participantIds).toContain(ceeId);
    expect(past.members.map((m) => m.name)).toContain('Cee');
    expect(ok(await bob.trpc.query('group.get', { groupSlug: group.slug })).members.map((m) => m.name)).not.toContain('Cee');
  });
});
