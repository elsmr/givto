// Email invitees who haven't answered yet are in the draw (98); declining or letting the invite
// expire takes them out like leaving does.
import { expect, latestMail, ok, test, uniqueEmail, type TestDb, type User } from '../fixtures';
import { codeOf, createFamily, inviteTokenFrom, joinAll, memberByEmail, signInEmail } from './s1-group';

const DAY = 24 * 60 * 60 * 1000;

const assignmentsOf = async (db: TestDb, slug: string) => {
  const { _id: groupId } = (await db.groups.findOne({ slug }))!;
  return (await db.editions.findOne({ groupId, number: 1 }))!.draw?.assignments ?? {};
};

const familyWith = async (ann: User, people: [User, string][], secrets: string[], invitee: string) => {
  const group = await createFamily(ann);
  await joinAll(group, people);
  const email = uniqueEmail(invitee);
  secrets.push(email);
  const { memberId } = ok(await ann.trpc.mutate('invite.send', { groupSlug: group.slug, email }));
  return { slug: group.slug, email, memberId, edition: { groupSlug: group.slug, editionNumber: 1 } };
};

test('an invitee is drawn, hears it with an invite link, and keeps the giftee on accept', async ({ signIn, newClient, secrets, db }) => {
  const [ann, bob] = await Promise.all([signIn('ann'), signIn('bob')]);
  const { slug, email, memberId, edition } = await familyWith(ann, [[bob, 'Bob']], secrets, 'fay');
  expect(ok(await ann.trpc.query('group.get', { groupSlug: slug })).edition?.participantIds).toContain(memberId);

  ok(await ann.trpc.mutate('draw.run', edition));
  const drawn = await assignmentsOf(db, slug);
  expect(Object.keys(drawn)).toHaveLength(3);
  expect(drawn[memberId], 'invitee has a giftee').toBeDefined();
  expect(Object.values(drawn)).toContain(memberId);

  await latestMail(email, 'namesDrawn');
  const token = await inviteTokenFrom(email);
  const fay = await signInEmail(await newClient(), email, secrets);
  ok(await fay.trpc.mutate('invite.accept', { groupSlug: slug, token, name: 'Fay' }));
  expect((await memberByEmail(ann, slug, email))?.status).toBe('joined');
  expect(await assignmentsOf(db, slug)).toEqual(drawn);
});

test('declining after the draw takes the invitee out', async ({ signIn, newClient, secrets, db }) => {
  const [ann, bob, cee] = await Promise.all([signIn('ann'), signIn('bob'), signIn('cee')]);
  const { slug, email, memberId, edition } = await familyWith(ann, [[bob, 'Bob'], [cee, 'Cee']], secrets, 'gus');
  ok(await ann.trpc.mutate('draw.run', edition));
  const token = await inviteTokenFrom(email);
  ok(await (await newClient()).trpc.mutate('invite.decline', { groupSlug: slug, token }));
  const after = await assignmentsOf(db, slug);
  expect(Object.keys(after)).toHaveLength(3);
  expect([...Object.keys(after), ...Object.values(after)]).not.toContain(memberId);
  expect(ok(await ann.trpc.query('group.get', { groupSlug: slug })).edition?.participantIds).not.toContain(memberId);
});

test('an expired invite: not counted for the draw, and taken out after it', async ({ signIn, secrets, db }) => {
  const [ann, bob, cee] = await Promise.all([signIn('ann'), signIn('bob'), signIn('cee')]);
  const early = await familyWith(ann, [[bob, 'Bob']], secrets, 'ivy');
  await db.groups.updateOne({ slug: early.slug, 'members.id': early.memberId }, { $set: { 'members.$.invitedAt': new Date(Date.now() - 8 * DAY) } });
  expect(codeOf(await ann.trpc.mutate('draw.run', early.edition))).toBe('TOO_FEW_PEOPLE');

  const late = await familyWith(ann, [[bob, 'Bob'], [cee, 'Cee']], secrets, 'joe');
  ok(await ann.trpc.mutate('draw.run', late.edition));
  expect((await assignmentsOf(db, late.slug))[late.memberId]).toBeDefined();
  const { _id: groupId } = (await db.groups.findOne({ slug: late.slug }))!;
  ok(await ann.trpc.mutate('reminders.runDue', { now: new Date(Date.now() + 8 * DAY).toISOString(), groupIds: [groupId] }));
  const after = await assignmentsOf(db, late.slug);
  expect(Object.keys(after)).toHaveLength(3);
  expect([...Object.keys(after), ...Object.values(after)]).not.toContain(late.memberId);
  const { members } = ok(await ann.trpc.query('group.get', { groupSlug: late.slug }));
  expect(members.find((m) => m.id === late.memberId)?.status).toBe('declined');
});
