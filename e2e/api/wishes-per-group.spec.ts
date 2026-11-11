// Wishes per group (opt-in): a new wish shows in no group unless picked; groupView's `alsoIn` names
// my other active groups (not archived, latest edition not done) that show it too. A new membership starts
// with nothing shown; each group has its own order.
import { expect, ok, test, type User } from '../fixtures';
import { inviteTokenFrom } from './s1-group';
import { codeOf, createGroup, groupOf, join } from './s4-group';

const shownTitles = async (person: User, groupSlug: string) =>
  ok(await person.trpc.query('wish.groupView', { groupSlug })).filter((wish) => wish.shown).map((wish) => wish.title);

test('a new wish shows only in the groups picked; alsoIn lists the other active ones', async ({ signIn, db }) => {
  const [ann, bob] = await Promise.all([signIn('ann'), signIn('bob')]);
  const [home, work, done, archived, spare] = await Promise.all(['Home', 'Work', 'Done', 'Archived', 'Spare'].map((name) => createGroup(ann, name)));
  await db.editions.updateOne({ groupId: (await groupOf(db, done.slug))._id, number: 1 }, { $set: { status: 'done' } });
  await db.groups.updateOne({ slug: archived.slug }, { $set: { archivedAt: new Date() } });
  const notMine = await createGroup(bob, 'Not mine');
  const viewOf = async (slug: string, wishId: string) =>
    ok(await ann.trpc.query('wish.groupView', { groupSlug: slug })).find((wish) => wish.id === wishId)!;

  const plain = ok(await ann.trpc.mutate('wish.create', { title: 'Socks' }));
  for (const group of [home, work, done, archived, spare]) expect((await viewOf(group.slug, plain.id)).shown, group.slug).toBe(false);

  const picked = ok(await ann.trpc.mutate('wish.create', { title: 'Mug', groupSlugs: [home.slug, work.slug, done.slug, archived.slug] }));
  for (const group of [home, work, done, archived]) expect((await viewOf(group.slug, picked.id)).shown, group.slug).toBe(true);
  expect((await viewOf(spare.slug, picked.id)).shown).toBe(false);
  expect((await viewOf(home.slug, picked.id)).alsoIn).toEqual([{ name: 'Work' }]);
  expect((await viewOf(spare.slug, picked.id)).alsoIn.map(({ name }) => name).toSorted()).toEqual(['Home', 'Work']);
  expect((await viewOf(home.slug, plain.id)).alsoIn).toEqual([]);

  expect(codeOf(await ann.trpc.mutate('wish.create', { title: 'Sneaky', groupSlugs: [home.slug, notMine.slug] }))).toBe('GROUP_NOT_FOUND');
  expect(ok(await ann.trpc.query('wish.list')).map((wish) => wish.title)).toEqual(['Mug', 'Socks']);
});

test('a new membership starts with no wishes shown; a rejoin keeps its own', async ({ signIn }) => {
  const [ann, bob, cee] = await Promise.all([signIn('ann'), signIn('bob'), signIn('cee')]);
  ok(await ann.trpc.mutate('wish.create', { title: 'A' }));
  const fresh = await createGroup(ann, 'Fresh');
  expect(await shownTitles(ann, fresh.slug)).toEqual([]);

  ok(await bob.trpc.mutate('wish.create', { title: 'X' }));
  await join(bob, fresh, 'Bob');
  expect(await shownTitles(bob, fresh.slug)).toEqual([]);
  const [x] = ok(await bob.trpc.query('wish.list'));
  ok(await bob.trpc.mutate('wish.setShown', { groupSlug: fresh.slug, wishId: x.id, shown: true }));
  ok(await bob.trpc.mutate('membership.leave', { groupSlug: fresh.slug }));
  await join(bob, fresh, 'Bob');
  expect(await shownTitles(bob, fresh.slug)).toEqual(['X']);

  ok(await cee.trpc.mutate('wish.create', { title: 'Z' }));
  ok(await ann.trpc.mutate('invite.send', { groupSlug: fresh.slug, email: cee.email }));
  ok(await cee.trpc.mutate('invite.accept', { groupSlug: fresh.slug, token: await inviteTokenFrom(cee.email), name: 'Cee' }));
  expect(await shownTitles(cee, fresh.slug)).toEqual([]);
});

test('each group has its own order: new wishes on top, shown again at the end', async ({ signIn }) => {
  const ann = await signIn('ann');
  const [home, work] = await Promise.all(['Home', 'Work'].map((name) => createGroup(ann, name)));
  const groupSlugs = [home.slug, work.slug];
  const a = ok(await ann.trpc.mutate('wish.create', { title: 'A', groupSlugs }));
  const b = ok(await ann.trpc.mutate('wish.create', { title: 'B', groupSlugs }));
  const c = ok(await ann.trpc.mutate('wish.create', { title: 'C', groupSlugs }));
  expect(await shownTitles(ann, home.slug)).toEqual(['C', 'B', 'A']);

  ok(await ann.trpc.mutate('wish.moveInGroup', { groupSlug: home.slug, wishId: a.id, toIndex: 0 }));
  expect(await shownTitles(ann, home.slug)).toEqual(['A', 'C', 'B']);
  expect(await shownTitles(ann, work.slug)).toEqual(['C', 'B', 'A']);
  expect(ok(await ann.trpc.query('wish.list')).map((wish) => wish.title)).toEqual(['C', 'B', 'A']);

  ok(await ann.trpc.mutate('wish.setShown', { groupSlug: home.slug, wishId: c.id, shown: false }));
  expect(codeOf(await ann.trpc.mutate('wish.moveInGroup', { groupSlug: home.slug, wishId: c.id, toIndex: 0 }))).toBe('NOT_FOUND');
  ok(await ann.trpc.mutate('wish.setShown', { groupSlug: home.slug, wishId: c.id, shown: true }));
  expect(await shownTitles(ann, home.slug)).toEqual(['A', 'B', 'C']);

  ok(await ann.trpc.mutate('wish.archive', { wishId: b.id }));
  ok(await ann.trpc.mutate('wish.moveInGroup', { groupSlug: home.slug, wishId: c.id, toIndex: 0 }));
  ok(await ann.trpc.mutate('wish.restore', { wishId: b.id }));
  expect(await shownTitles(ann, home.slug)).toEqual(['C', 'A', 'B']);
});
