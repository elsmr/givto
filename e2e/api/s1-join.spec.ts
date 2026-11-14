// S1 create & join (first half): creating a group, the join link,
// approval, the member cap, revoking and regenerating the link. Every test has its own group.
import { expect, mailsTo, ok, readServerLog, test, uniqueEmail, type MutationPath } from '../fixtures';
import { codeOf, createFamily, createInput, joinAll, memberByEmail, signInEmail } from './s1-group';

test('create without a session → UNAUTHENTICATED, no mail sent', async ({ newClient, secrets }) => {
  const { trpc } = await newClient();
  const result = await trpc.mutate('group.create', createInput);
  expect(result.status).toBe(401);
  expect(codeOf(result)).toBe('UNAUTHENTICATED');
  const victim = uniqueEmail('victim');
  secrets.push(victim);
  const invite = await trpc.mutate('invite.send', { groupSlug: 'abcdefgh', email: victim });
  expect(codeOf(invite)).toBe('UNAUTHENTICATED');
  expect(await mailsTo(victim)).toHaveLength(0);
});

test('create after verifying the email (dotted name ok, URL name and past gift day rejected)', async ({ signIn }) => {
  const ann = await signIn('ann');
  expect(codeOf(await ann.trpc.mutate('group.create', { ...createInput, name: 'win at evil.com' }))).toBe('INVALID_INPUT');
  expect(codeOf(await ann.trpc.mutate('group.create', { ...createInput, giftDay: { date: '2001-01-01' } }))).toBe('DATE_IN_PAST');
  const { slug, joinToken } = await createFamily(ann);
  const data = ok(await ann.trpc.query('group.get', { groupSlug: slug }));
  expect(data.name).toBe('Family');
  expect(data.me.isOrganizer).toBe(true);
  expect(data.edition?.status).toBe('open');
  expect(data.edition?.budget).toEqual({ currency: 'EUR', amount: 2500 });
  expect(data.members[0].email).toBe(ann.email);
  expect(data.organizer?.joinLink?.token).toBe(joinToken);
  expect(ok(await ann.trpc.query('account.get')).name).toBe('Ann.Smith');
  expect(readServerLog(), 'procedure lines are logged').toMatch(/group\.create/);
});

test('join via link: preview without member list, join after verifying, members see names only', async ({ signIn, newClient }) => {
  const [ann, bob] = await Promise.all([signIn('ann'), signIn('bob')]);
  const { slug, joinToken: token } = await createFamily(ann);
  const anonymous = await newClient();
  const preview = await anonymous.trpc.query('join.preview', { groupSlug: slug, token });
  expect(preview.data).toEqual({ groupName: 'Family', organizerFirstName: 'Ann.Smith', requiresApproval: false });
  expect((await anonymous.trpc.query('join.preview', { groupSlug: slug, token: 'x'.repeat(24) })).data).toBeNull();
  expect(codeOf(await anonymous.trpc.mutate('join.accept', { groupSlug: slug, token, name: 'Bob' }))).toBe('UNAUTHENTICATED');
  expect(codeOf(await bob.trpc.mutate('join.accept', { groupSlug: slug, token, name: 'bob.com' }))).toBe('INVALID_INPUT');
  const joined = await bob.trpc.mutate('join.accept', { groupSlug: slug, token, name: 'Bob' });
  expect(joined.data).toEqual({ slug, status: 'joined' });
  const data = ok(await bob.trpc.query('group.get', { groupSlug: slug }));
  expect(data.me.isOrganizer).toBe(false);
  expect(data.members.map((m) => m.name)).toEqual(['Ann.Smith', 'Bob']);
  expect(data.members.every((m) => m.email === undefined)).toBe(true);
  expect(data.organizer).toBeUndefined();
  expect(data.edition?.participantIds).toHaveLength(2);
});

test('the name lives on the account: asked once, then the account name wins', async ({ signIn }) => {
  const [ann, bob] = await Promise.all([signIn('ann'), signIn('bob')]);
  const [first, second] = await Promise.all([createFamily(ann), createFamily(ann)]);
  expect(codeOf(await bob.trpc.mutate('join.accept', { groupSlug: first.slug, token: first.joinToken }))).toBe('NAME_REQUIRED');
  ok(await bob.trpc.mutate('join.accept', { groupSlug: first.slug, token: first.joinToken, name: 'Bob' }));
  ok(await bob.trpc.mutate('join.accept', { groupSlug: second.slug, token: second.joinToken, name: 'Other' }));
  const names = async (slug: string) => ok(await bob.trpc.query('group.get', { groupSlug: slug })).members.map((m) => m.name);
  expect(await names(second.slug)).toEqual(['Ann.Smith', 'Bob']);
  ok(await bob.trpc.mutate('account.setName', { name: 'Robert' }));
  expect(await names(first.slug)).toEqual(['Ann.Smith', 'Robert']);
  expect(await names(second.slug)).toEqual(['Ann.Smith', 'Robert']);
});

test('the avatar colour lives on the account: every group, and groups joined later, show it', async ({ signIn }) => {
  const [ann, bob] = await Promise.all([signIn('ann'), signIn('bob')]);
  const [first, second] = await Promise.all([createFamily(ann), createFamily(ann)]);
  await joinAll(first, [[bob, 'Bob']]);
  const colors = async (slug: string) => ok(await bob.trpc.query('group.get', { groupSlug: slug })).members.map((m) => m.avatarColor);
  expect(await colors(first.slug)).toEqual([undefined, undefined]);
  expect(codeOf(await bob.trpc.mutate('account.setAvatarColor', { avatarColor: 'primary' as never }))).toBe('INVALID_INPUT');
  ok(await bob.trpc.mutate('account.setAvatarColor', { avatarColor: 'mint' }));
  expect(await colors(first.slug)).toEqual([undefined, 'mint']);
  await joinAll(second, [[bob, 'Bob']]);
  expect(await colors(second.slug)).toEqual([undefined, 'mint']);
});

test('same email twice = one member', async ({ signIn, newClient, secrets }) => {
  const [ann, bob] = await Promise.all([signIn('ann'), signIn('bob')]);
  const group = await createFamily(ann);
  await joinAll(group, [[bob, 'Bob']]);
  const { slug, joinToken: token } = group;
  const again = ok(await bob.trpc.mutate('join.accept', { groupSlug: slug, token, name: 'Bobby' }));
  expect(again.status).toBe('joined');
  const otherSession = await signInEmail(await newClient(), bob.email, secrets);
  await otherSession.trpc.mutate('join.accept', { groupSlug: slug, token, name: 'Bob' });
  const data = ok(await ann.trpc.query('group.get', { groupSlug: slug }));
  expect(data.members.filter((m) => m.email === bob.email)).toHaveLength(1);
  expect(data.joinedCount).toBe(2);
});

test('non-organizer can’t manage; outsiders don’t see the group', async ({ signIn, secrets }) => {
  const [ann, bob, outsider] = await Promise.all([signIn('ann'), signIn('bob'), signIn('out')]);
  const group = await createFamily(ann);
  await joinAll(group, [[bob, 'Bob']]);
  const { slug } = group;
  const zed = uniqueEmail('zed');
  secrets.push(zed);
  for (const [path, input] of [
    ['join.revokeLink', {}],
    ['join.regenerateLink', {}],
    ['join.updateLink', { requiresApproval: true, maxMembers: null }],
    ['invite.send', { email: zed }],
    ['membership.approve', { memberId: '0'.repeat(24) }],
    ['group.setKeepApart', { households: [] }],
  ] as [MutationPath, object][]) {
    expect(codeOf(await bob.trpc.mutate(path, { groupSlug: slug, ...input } as never)), path).toBe('NOT_ORGANIZER');
  }
  expect(await mailsTo(zed)).toHaveLength(0);
  expect(codeOf(await outsider.trpc.query('group.get', { groupSlug: slug }))).toBe('GROUP_NOT_FOUND');
  expect(codeOf(await outsider.trpc.query('group.get', { groupSlug: 'nope-nope' }))).toBe('GROUP_NOT_FOUND');
});

test('approval flow: requested until approved; rejected stays out', async ({ signIn, newClient }) => {
  const [ann, cee, dee] = await Promise.all([signIn('ann'), signIn('cee'), signIn('dee')]);
  const { slug, joinToken: token } = await createFamily(ann);
  ok(await ann.trpc.mutate('join.updateLink', { groupSlug: slug, requiresApproval: true, maxMembers: null }));
  expect((await (await newClient()).trpc.query('join.preview', { groupSlug: slug, token })).data?.requiresApproval).toBe(true);
  expect(ok(await cee.trpc.mutate('join.accept', { groupSlug: slug, token, name: 'Cee' })).status).toBe('requested');
  expect(codeOf(await cee.trpc.query('group.get', { groupSlug: slug }))).toBe('GROUP_NOT_FOUND');
  const requested = (await memberByEmail(ann, slug, cee.email))!;
  expect(requested.status).toBe('requested');
  expect((await ann.trpc.mutate('membership.approve', { groupSlug: slug, memberId: requested.id })).status).toBe(200);
  expect(ok(await cee.trpc.query('group.get', { groupSlug: slug })).edition?.participantIds).toContain(requested.id);

  await dee.trpc.mutate('join.accept', { groupSlug: slug, token, name: 'Dee' });
  await ann.trpc.mutate('membership.reject', { groupSlug: slug, memberId: (await memberByEmail(ann, slug, dee.email))!.id });
  expect(codeOf(await dee.trpc.query('group.get', { groupSlug: slug }))).toBe('GROUP_NOT_FOUND');
  expect(await memberByEmail(ann, slug, dee.email)).toBeUndefined();
});

test('member cap: full link refuses new people', async ({ signIn }) => {
  const [ann, bob, cee, eve] = await Promise.all(['ann', 'bob', 'cee', 'eve'].map((name) => signIn(name)));
  const group = await createFamily(ann);
  await joinAll(group, [[bob, 'Bob'], [cee, 'Cee']]);
  const { slug, joinToken: token } = group;
  ok(await ann.trpc.mutate('join.updateLink', { groupSlug: slug, requiresApproval: false, maxMembers: 3 }));
  expect(codeOf(await eve.trpc.mutate('join.accept', { groupSlug: slug, token, name: 'Eve' }))).toBe('GROUP_FULL');
  ok(await ann.trpc.mutate('join.updateLink', { groupSlug: slug, requiresApproval: false, maxMembers: null }));
  expect(ok(await eve.trpc.mutate('join.accept', { groupSlug: slug, token, name: 'Eve' })).status).toBe('joined');
});

test('revoked link rejected; regenerated link works, old one doesn’t', async ({ signIn, newClient }) => {
  const [ann, late] = await Promise.all([signIn('ann'), signIn('late')]);
  const { slug, joinToken: token } = await createFamily(ann);
  ok(await ann.trpc.mutate('join.revokeLink', { groupSlug: slug }));
  expect((await (await newClient()).trpc.query('join.preview', { groupSlug: slug, token })).data).toBeNull();
  expect(codeOf(await late.trpc.mutate('join.accept', { groupSlug: slug, token, name: 'Late' }))).toBe('JOIN_LINK_INVALID');
  const fresh = ok(await ann.trpc.mutate('join.regenerateLink', { groupSlug: slug })).token;
  expect(fresh).not.toBe(token);
  expect(codeOf(await late.trpc.mutate('join.accept', { groupSlug: slug, token, name: 'Late' }))).toBe('JOIN_LINK_INVALID');
  expect(ok(await late.trpc.mutate('join.accept', { groupSlug: slug, token: fresh, name: 'Late' })).status).toBe('joined');
});
