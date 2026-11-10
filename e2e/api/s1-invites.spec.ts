// S1 create & join (second half): email invites, keep apart, leaving,
// the invite rate limit. Every test has its own group.
import { expect, latestMail, mailsTo, ok, test, uniqueEmail } from '../fixtures';
import { codeOf, createFamily, inviteTokenFrom, joinAll, memberByEmail, signInEmail } from './s1-group';

test('email invite: bound to the email, single-use, lands on the group', async ({ signIn, newClient, secrets }) => {
  const [ann, bob] = await Promise.all([signIn('ann'), signIn('bob')]);
  const group = await createFamily(ann);
  await joinAll(group, [[bob, 'Bob']]);
  const { slug } = group;
  const fay = uniqueEmail('fay');
  secrets.push(fay);
  ok(await ann.trpc.mutate('invite.send', { groupSlug: slug, name: 'Fay', email: fay }));
  expect((await latestMail(fay)).subject).toBe('Ann.Smith invited you to Family on Givto');
  const token = await inviteTokenFrom(fay);
  const anonymous = await newClient();
  expect((await anonymous.trpc.query('invite.preview', { groupSlug: slug, token })).data?.invite?.email).toBe(fay);
  expect(codeOf(await bob.trpc.mutate('invite.accept', { groupSlug: slug, token }))).toBe('INVITE_EMAIL_MISMATCH');
  const fayClient = await signInEmail(await newClient(), fay, secrets);
  expect((await fayClient.trpc.mutate('invite.accept', { groupSlug: slug, token })).data).toEqual({ slug });
  expect(codeOf(await fayClient.trpc.mutate('invite.accept', { groupSlug: slug, token }))).toBe('INVITE_INVALID');
  expect((await anonymous.trpc.query('invite.preview', { groupSlug: slug, token })).data).toBeNull();
  expect((await fayClient.trpc.query('group.get', { groupSlug: slug })).status).toBe(200);
  expect((await memberByEmail(ann, slug, fay))?.status).toBe('joined');
  expect(codeOf(await ann.trpc.mutate('invite.send', { groupSlug: slug, name: 'Fay', email: fay }))).toBe('ALREADY_MEMBER');
});

test('decline an email invite without an account', async ({ signIn, newClient, secrets }) => {
  const ann = await signIn('ann');
  const { slug } = await createFamily(ann);
  const gus = uniqueEmail('gus');
  secrets.push(gus);
  ok(await ann.trpc.mutate('invite.send', { groupSlug: slug, name: 'Gus', email: gus }));
  const token = await inviteTokenFrom(gus);
  const anonymous = await newClient();
  expect((await anonymous.trpc.mutate('invite.decline', { groupSlug: slug, token })).status).toBe(200);
  expect((await memberByEmail(ann, slug, gus))?.status).toBe('declined');
  expect(codeOf(await anonymous.trpc.mutate('invite.decline', { groupSlug: slug, token }))).toBe('INVITE_INVALID');
});

test('invited email joining via the link = the same person', async ({ signIn }) => {
  const [ann, hal] = await Promise.all([signIn('ann'), signIn('hal')]);
  const { slug, joinToken: token } = await createFamily(ann);
  ok(await ann.trpc.mutate('invite.send', { groupSlug: slug, name: 'Hal', email: hal.email }));
  expect(ok(await hal.trpc.mutate('join.accept', { groupSlug: slug, token, name: 'Hal' })).status).toBe('joined');
  const { members } = ok(await ann.trpc.query('group.get', { groupSlug: slug }));
  expect(members.filter((m) => m.name === 'Hal')).toHaveLength(1);
  expect(members.find((m) => m.name === 'Hal')?.status).toBe('joined');
});

test('keep apart: rows saved, overlapping too; older pairs read as rows; impossible or repeated refused', async ({ signIn, db }) => {
  const [ann, bob, cee, dan] = await Promise.all(['ann', 'bob', 'cee', 'dan'].map((name) => signIn(name)));
  const group = await createFamily(ann);
  await joinAll(group, [[bob, 'Bob'], [cee, 'Cee'], [dan, 'Dan']]);
  const { slug } = group;
  const joinedIds = ok(await ann.trpc.query('group.get', { groupSlug: slug }))
    .members.filter((m) => m.status === 'joined')
    .map((m) => m.id);
  const [annId, bobId, ceeId] = joinedIds;
  const rows = async () => ok(await ann.trpc.query('group.get', { groupSlug: slug })).organizer?.households;
  ok(await ann.trpc.mutate('group.setKeepApart', { groupSlug: slug, households: [[annId, bobId], [bobId, ceeId]] }));
  expect(await rows()).toEqual([[annId, bobId], [bobId, ceeId]]);
  const everyone = await ann.trpc.mutate('group.setKeepApart', { groupSlug: slug, households: [joinedIds] });
  expect(codeOf(everyone)).toBe('DRAW_IMPOSSIBLE');
  expect(codeOf(await ann.trpc.mutate('group.setKeepApart', { groupSlug: slug, households: [[annId, annId]] }))).toBe('INVALID_INPUT');
  expect(await rows()).toHaveLength(2);

  await db.groups.updateOne({ slug }, { $set: { households: [], exclusions: [{ from: annId, to: ceeId }, { from: ceeId, to: annId }] } });
  expect(await rows()).toEqual([[annId, ceeId].toSorted()]);
  ok(await ann.trpc.mutate('group.setKeepApart', { groupSlug: slug, households: [[annId, ceeId]] }));
  const stored = (await db.groups.findOne({ slug }))!;
  expect(stored.exclusions, 'saved as a row').toEqual([]);
  expect(stored.households.map((h) => h.memberIds)).toEqual([[annId, ceeId]]);
});

test('leave before the draw; organizer can’t leave; leaving after the draw works (S4 patches the draw)', async ({ signIn, db }) => {
  const [ann, bob, cee, dan, eve] = await Promise.all(['ann', 'bob', 'cee', 'dan', 'eve'].map((name) => signIn(name)));
  const group = await createFamily(ann);
  await joinAll(group, [[bob, 'Bob'], [cee, 'Cee'], [dan, 'Dan'], [eve, 'Eve']]);
  const { slug } = group;
  const annId = (await memberByEmail(ann, slug, ann.email))!.id;
  const bobId = (await memberByEmail(ann, slug, bob.email))!.id;
  ok(await ann.trpc.mutate('group.setKeepApart', { groupSlug: slug, households: [[annId, bobId]] }));
  expect(codeOf(await ann.trpc.mutate('membership.leave', { groupSlug: slug }))).toBe('ORGANIZER_CANNOT_LEAVE');
  expect((await bob.trpc.mutate('membership.leave', { groupSlug: slug })).status).toBe(200);
  expect(codeOf(await bob.trpc.query('group.get', { groupSlug: slug }))).toBe('GROUP_NOT_FOUND');
  const data = ok(await ann.trpc.query('group.get', { groupSlug: slug }));
  expect(data.edition?.participantIds).not.toContain(bobId);
  expect(data.organizer?.households, 'a one-person household is dropped').toHaveLength(0);
  const { _id: groupId } = (await db.groups.findOne({ slug }))!;
  await db.editions.updateOne({ groupId }, { $set: { status: 'drawn' } });
  expect((await cee.trpc.mutate('membership.leave', { groupSlug: slug })).status).toBe(200);
});

test('invites rate limited per organizer', async ({ signIn, secrets }) => {
  const ann = await signIn('ann');
  const { slug } = await createFamily(ann);
  // 30 a day per organizer: the 31st is refused.
  const guests = Array.from({ length: 31 }, (_, i) => uniqueEmail(`guest${i}`));
  secrets.push(...guests);
  const codes = [];
  for (const [i, email] of guests.entries()) {
    codes.push(codeOf(await ann.trpc.mutate('invite.send', { groupSlug: slug, name: `Guest ${i}`, email })) ?? 'ok');
  }
  expect(codes, codes.join(',')).toContain('RATE_LIMITED');
  expect(await mailsTo(guests[30])).toHaveLength(0);
});
