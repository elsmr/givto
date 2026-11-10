import { expect, ok, test, type User } from '../fixtures';

const todosOf = async (user: User, slug: string) =>
  ok(await user.trpc.query('account.groups')).find((group) => group.slug === slug)?.todos;

test('account.groups lists to-dos per group', async ({ signIn, db }) => {
  const [ann, bob, cee, dee] = await Promise.all(['ann', 'bob', 'cee', 'dee'].map((name) => signIn(name)));
  const group = ok(
    await ann.trpc.mutate('group.create', {
      name: 'Todos',
      organizerName: 'Ann',
      timeZone: 'Europe/Brussels',
      giftDay: { date: '2099-12-24' },
      exchangeMode: 'inPerson',
    })
  );
  const edition = { groupSlug: group.slug, editionNumber: 1 };
  for (const [person, name] of [[bob, 'Bob'], [cee, 'Cee']] as const) {
    ok(await person.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name }));
  }
  ok(await ann.trpc.mutate('join.updateLink', { groupSlug: group.slug, requiresApproval: true, maxMembers: null }));
  ok(await dee.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name: 'Dee' }));

  await test.step('open: organizer has join requests and can draw; nobody has wishes', async () => {
    const dashboard = ok(await ann.trpc.query('account.groups')).find((g) => g.slug === group.slug);
    expect(dashboard?.edition?.participantCount).toBe(3);
    expect(dashboard?.todos).toEqual([{ kind: 'joinRequests', count: 1 }, { kind: 'readyToDraw' }, { kind: 'noWishes' }]);
    expect(await todosOf(bob, group.slug)).toEqual([{ kind: 'noWishes' }]);
  });

  const wish = ok(await bob.trpc.mutate('wish.create', { title: 'Socks' }));
  await test.step('a wish hidden in this group still counts as none', async () => {
    expect(await todosOf(bob, group.slug)).toEqual([]);
    ok(await bob.trpc.mutate('wish.setHidden', { groupSlug: group.slug, wishId: wish.id, hidden: true }));
    expect(await todosOf(bob, group.slug)).toEqual([{ kind: 'noWishes' }]);
    ok(await bob.trpc.mutate('wish.setHidden', { groupSlug: group.slug, wishId: wish.id, hidden: false }));
  });

  ok(await ann.trpc.mutate('draw.run', edition));
  const { _id: groupId, members } = (await db.groups.findOne({ slug: group.slug }))!;
  const { _id: editionId, draw } = (await db.editions.findOne({ groupId, number: 1 }))!;
  const bobId = members.find((m) => m.userId === bob.id)!.id;
  const santaId = Object.entries(draw!.assignments).find(([, gifteeId]) => gifteeId === bobId)![0];
  const santa = [ann, cee].find((user) => members.find((m) => m.id === santaId)?.userId === user.id)!;

  await test.step('only delivered questions show for the giftee', async () => {
    const first = ok(await santa.trpc.mutate('question.ask', { ...edition, text: 'Size?' }));
    ok(await santa.trpc.mutate('question.ask', { ...edition, text: 'Colour?' }));
    expect(await todosOf(bob, group.slug)).toEqual([]);
    await db.questions.updateOne({ _id: first.id, editionId }, { $set: { notifyAfter: new Date(Date.now() - 1000) } });
    expect(await todosOf(bob, group.slug)).toEqual([{ kind: 'question', count: 1 }]);
  });

  await test.step('gift day', async () => {
    await db.editions.updateOne({ _id: editionId }, { $set: { status: 'giftday' } });
    expect(await todosOf(bob, group.slug)).toEqual([{ kind: 'question', count: 1 }, { kind: 'giftDay' }]);
  });

  await test.step('done: wishes left to mark received, for two weeks after gift day', async () => {
    const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
    await db.editions.updateOne({ _id: editionId }, { $set: { status: 'done', 'giftDay.date': daysAgo(14) } });
    expect(await todosOf(bob, group.slug)).toEqual([{ kind: 'markReceived', count: 1 }]);
    await db.editions.updateOne({ _id: editionId }, { $set: { 'giftDay.date': daysAgo(16) } });
    expect(await todosOf(bob, group.slug)).toEqual([]);
    await db.editions.updateOne({ _id: editionId }, { $unset: { giftDay: true } });
    expect(await todosOf(bob, group.slug)).toEqual([]);
  });

  await test.step('archived groups have none', async () => {
    await db.groups.updateOne({ _id: groupId }, { $set: { archivedAt: new Date() } });
    expect(await todosOf(ann, group.slug)).toEqual([]);
  });
});
