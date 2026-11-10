// Shared by the s6 gift day specs.
import { ok, type TestDb, type User } from '../fixtures';

export const code = (result: { error?: { data: { appCode?: string } } }) => result.error?.data.appCode;

export const editionOf = async (db: TestDb, slug: string) => {
  const { _id: groupId } = (await db.groups.findOne({ slug }))!;
  return (await db.editions.findOne({ groupId, number: 1 }))!;
};
export const memberIdOf = async (db: TestDb, slug: string, user: User) =>
  (await db.groups.findOne({ slug }))!.members.find((m) => m.userId === user.id)!.id;

/** Ann organizes; the others join; names drawn. */
export const drawnGroup = async (
  [ann, ...others]: User[],
  name: string,
  { timeZone = 'Europe/Brussels', date = '2099-12-24' } = {}
) => {
  const group = ok(
    await ann.trpc.mutate('group.create', { name, organizerName: 'Ann', timeZone, giftDay: { date }, exchangeMode: 'inPerson' })
  );
  for (const [i, person] of others.entries()) {
    ok(await person.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name: ['Bob', 'Cee', 'Dan'][i] }));
  }
  ok(await ann.trpc.mutate('draw.run', { groupSlug: group.slug, editionNumber: 1 }));
  return group;
};
