// Several organizers: the owner names and drops them, hands the group over, and alone deletes it.
import { expect, ok, test } from '../fixtures';
import { codeOf, createFamily, joinAll, memberByEmail } from './s1-group';

test('the owner names organizers; organizers run the group but only the owner manages roles', async ({ signIn }) => {
  const [ann, bob, cee, dan] = await Promise.all(['ann', 'bob', 'cee', 'dan'].map((name) => signIn(name)));
  const group = await createFamily(ann);
  await joinAll(group, [[bob, 'Bob'], [cee, 'Cee'], [dan, 'Dan']]);
  const groupSlug = group.slug;
  const [annId, bobId, ceeId, danId] = await Promise.all([ann, bob, cee, dan].map(async (u) => (await memberByEmail(ann, groupSlug, u.email))!.id));
  const roleOf = async (memberId: string) => ok(await ann.trpc.query('group.get', { groupSlug })).members.find((m) => m.id === memberId)?.role;

  expect(codeOf(await bob.trpc.mutate('settings.setOrganizer', { groupSlug, memberId: ceeId, organizer: true }))).toBe('NOT_ORGANIZER');
  ok(await ann.trpc.mutate('settings.setOrganizer', { groupSlug, memberId: bobId, organizer: true }));
  ok(await ann.trpc.mutate('settings.setOrganizer', { groupSlug, memberId: ceeId, organizer: true }));
  expect(await roleOf(bobId)).toBe('organizer');

  const asBob = ok(await bob.trpc.query('group.get', { groupSlug }));
  expect(asBob.me).toMatchObject({ isOrganizer: true, isOwner: false });
  ok(await bob.trpc.mutate('settings.rename', { groupSlug, name: 'Renamed by Bob' }));

  expect(codeOf(await bob.trpc.mutate('settings.setOrganizer', { groupSlug, memberId: danId, organizer: true }))).toBe('NOT_OWNER');
  expect(codeOf(await bob.trpc.mutate('settings.transferOwnership', { groupSlug, memberId: bobId }))).toBe('NOT_OWNER');
  expect(codeOf(await bob.trpc.mutate('settings.deleteGroup', { groupSlug }))).toBe('NOT_OWNER');
  expect(codeOf(await bob.trpc.mutate('settings.removePerson', { groupSlug, memberId: ceeId }))).toBe('NOT_OWNER');
  expect(codeOf(await bob.trpc.mutate('settings.removePerson', { groupSlug, memberId: annId }))).toBe('OWNER_CANNOT_LEAVE');
  ok(await bob.trpc.mutate('settings.removePerson', { groupSlug, memberId: danId }));

  expect(codeOf(await ann.trpc.mutate('settings.setOrganizer', { groupSlug, memberId: annId, organizer: false }))).toBe('NOT_FOUND');
  ok(await ann.trpc.mutate('settings.setOrganizer', { groupSlug, memberId: ceeId, organizer: false }));
  expect(await roleOf(ceeId)).toBe('member');
  expect(codeOf(await cee.trpc.mutate('settings.rename', { groupSlug, name: 'Nope' }))).toBe('NOT_ORGANIZER');
});

test('the owner hands the group to an organizer; an organizer who leaves and rejoins is a member', async ({ signIn, db }) => {
  const [ann, bob, cee] = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const group = await createFamily(ann);
  await joinAll(group, [[bob, 'Bob'], [cee, 'Cee']]);
  const groupSlug = group.slug;
  const [annId, bobId, ceeId] = await Promise.all([ann, bob, cee].map(async (u) => (await memberByEmail(ann, groupSlug, u.email))!.id));

  expect(codeOf(await ann.trpc.mutate('settings.transferOwnership', { groupSlug, memberId: bobId })), 'only to an organizer').toBe('NOT_FOUND');
  ok(await ann.trpc.mutate('settings.setOrganizer', { groupSlug, memberId: bobId, organizer: true }));
  ok(await ann.trpc.mutate('settings.transferOwnership', { groupSlug, memberId: bobId }));
  const stored = (await db.groups.findOne({ slug: groupSlug }))!;
  expect(Object.fromEntries(stored.members.map((m) => [m.id, m.role]))).toEqual({ [annId]: 'organizer', [bobId]: 'owner', [ceeId]: 'member' });
  expect(stored.createdBy).toBe(bob.id);
  expect(codeOf(await bob.trpc.mutate('membership.leave', { groupSlug }))).toBe('OWNER_CANNOT_LEAVE');

  ok(await ann.trpc.mutate('membership.leave', { groupSlug }));
  ok(await ann.trpc.mutate('join.accept', { groupSlug, token: group.joinToken }));
  const rejoined = ok(await bob.trpc.query('group.get', { groupSlug })).members.find((m) => m.id === annId);
  expect(rejoined).toMatchObject({ status: 'joined', role: 'member' });
});
