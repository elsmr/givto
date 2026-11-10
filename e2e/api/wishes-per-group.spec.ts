// Wishes per group (opt-in): a new wish shows in no group unless picked; groupView's `alsoIn` names
// my other active groups (not archived, latest edition not done) that show it too.
import { expect, ok, test } from '../fixtures';
import { codeOf, createGroup, groupOf } from './s4-group';

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
  expect(ok(await ann.trpc.query('wish.list')).map((wish) => wish.title)).toEqual(['Socks', 'Mug']);
});
