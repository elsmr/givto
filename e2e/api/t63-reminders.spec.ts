// Reminders v2 (63) through the test trigger `reminders.runDue` at chosen times in 2099, scoped to the
// test's own editions and groups: one combined email, "I've got my gift" stops gift reminders, each
// slot once, a week between emails, posted exchanges, ready to draw, the organizer's join digest.
// The schedule itself: tests/reminder-schedule.check.mjs.
import enEmail from '@/messages/en/email.json' with { type: 'json' };
import nlEmail from '@/messages/nl/email.json' with { type: 'json' };
import { expect, mailsTo, ok, test, type User } from '../fixtures';
import { drawnGroup, editionOf } from './s6-helpers';

const runAt = async (user: User, now: string, scope: { editionIds?: string[]; groupIds?: string[] }) =>
  ok(await user.trpc.mutate('reminders.runDue', { now, ...scope }));
const count = async (user: User, kind: string) => (await mailsTo(user.email, kind)).length;

test('one email per week: wishlist + gift combined, got-my-gift stops gift reminders, each slot once', async ({ signIn, db }) => {
  const [ann, bob, cee] = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const group = await drawnGroup([ann, bob, cee], 'Weekly');
  const at = { groupSlug: group.slug, editionNumber: 1 };
  const editionIds = [(await editionOf(db, group.slug))._id];
  ok(await bob.trpc.mutate('wish.create', { title: 'Socks', groupSlugs: [group.slug] }));
  ok(await cee.trpc.mutate('gift.set', { ...at, wishIds: [], lines: ['A scarf'] }));

  await test.step('14 days before gift day: Ann both parts in one email, Bob the gift part, Cee (got hers) the wishlist part', async () => {
    await runAt(ann, '2099-12-10T10:00:00.000Z', { editionIds });
    await runAt(ann, '2099-12-10T11:00:00.000Z', { editionIds });
    expect(await count(ann, 'reminderCombined')).toBe(1);
    expect(await count(bob, 'reminderGift')).toBe(1);
    expect(await count(cee, 'reminderWishlist')).toBe(1);
    expect(await count(cee, 'reminderGift')).toBe(0);
    const [combined] = await mailsTo(ann.email, 'reminderCombined');
    expect(combined.subject).toBe(`${enEmail.reminder.wishlist.subject} · ${enEmail.reminder.gift.subject} · Weekly`);
    expect(combined.text).toContain(enEmail.reminder.wishlist.title);
    expect(combined.text).toContain(`/g/${group.slug}#giftee`);
    expect(combined.text).toContain('/wishlist');
  });

  await test.step('never two within a week', async () => {
    await runAt(ann, '2099-12-15T10:00:00.000Z', { editionIds });
    expect((await mailsTo(ann.email)).filter((mail) => mail.subject.endsWith('· Weekly'))).toHaveLength(1);
  });

  await test.step('7 days before: Bob marked his gift in between, so only Ann and Cee', async () => {
    ok(await bob.trpc.mutate('gift.set', { ...at, wishIds: [], lines: ['A book'] }));
    await runAt(ann, '2099-12-17T10:00:00.000Z', { editionIds });
    await runAt(ann, '2099-12-17T12:00:00.000Z', { editionIds });
    expect(await count(ann, 'reminderCombined')).toBe(2);
    expect(await count(bob, 'reminderGift')).toBe(1);
    expect(await count(cee, 'reminderWishlist')).toBe(2);
    expect(await db.sentNotifications.countDocuments({ editionId: editionIds[0], slots: { $exists: true } })).toBe(5);
  });

  await test.step('nothing from gift day on but the morning one', async () => {
    await runAt(ann, '2099-12-24T08:30:00.000Z', { editionIds });
    expect(await count(bob, 'reminderGiftDay')).toBe(1);
    expect(await db.sentNotifications.countDocuments({ editionId: editionIds[0], slots: { $exists: true } })).toBe(5);
  });
});

test('posted: gift reminders before the post-by date, in the Santa’s language', async ({ signIn, db }) => {
  const [ann, bob, cee] = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const group = await drawnGroup([ann, bob, cee], 'Posted');
  const edition = await editionOf(db, group.slug);
  await db.editions.updateOne({ _id: edition._id }, { $set: { exchangeMode: 'byPost', postBy: '2099-12-15' } });
  const address = { lines: ['Main street 1'], postalCode: '1000', city: 'Brussels', country: 'BE' as const };
  for (const user of [ann, bob, cee]) ok(await user.trpc.mutate('account.addAddress', { address }));
  await db.users.updateOne({ email: bob.email }, { $set: { locale: 'nl' } });
  for (const user of [ann, bob, cee]) ok(await user.trpc.mutate('wish.create', { title: 'Something', groupSlugs: [group.slug] }));
  await runAt(ann, '2099-12-16T10:00:00.000Z', { editionIds: [edition._id] });
  expect(await count(bob, 'reminderPost'), 'nothing after the post-by date').toBe(0);
  await runAt(ann, '2099-12-01T10:00:00.000Z', { editionIds: [edition._id] });
  const [post] = await mailsTo(bob.email, 'reminderPost');
  expect(post.subject).toMatch(new RegExp(`^${nlEmail.reminder.gift['subject-post'].replace('{date}', '.+')} · Posted$`));
});

test('ready to draw: once everyone invited by email joined, again 14 days before gift day', async ({ signIn, db }) => {
  const [ann, bob, cee, dee] = await Promise.all(['ann', 'bob', 'cee', 'dee'].map((name) => signIn(name)));
  const group = ok(await ann.trpc.mutate('group.create', { name: 'Ready', organizerName: 'Ann', timeZone: 'Europe/Brussels', giftDay: { date: '2099-12-24' }, exchangeMode: 'inPerson' }));
  ok(await ann.trpc.mutate('wish.create', { title: 'Tea', groupSlugs: [group.slug] }));
  for (const [user, name] of [[bob, 'Bob'], [cee, 'Cee']] as const) ok(await user.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name }));
  ok(await ann.trpc.mutate('invite.send', { groupSlug: group.slug, email: dee.email }));
  const editionIds = [(await editionOf(db, group.slug))._id];
  await runAt(ann, '2099-01-10T10:00:00.000Z', { editionIds });
  expect(await count(ann, 'reminderReadyToDraw'), 'Dee still invited').toBe(0);
  const token = (await mailsTo(dee.email)).at(-1)!.text.match(/[?&]invite=([A-Za-z0-9_-]+)/)![1];
  ok(await dee.trpc.mutate('invite.accept', { groupSlug: group.slug, token, name: 'Dee' }));
  await runAt(ann, '2099-01-11T10:00:00.000Z', { editionIds });
  await runAt(ann, '2099-01-20T10:00:00.000Z', { editionIds });
  const [ready] = await mailsTo(ann.email, 'reminderReadyToDraw');
  expect((await mailsTo(ann.email, 'reminderReadyToDraw')).length).toBe(1);
  expect(ready.text).toContain(enEmail.reminder.ready.body.replace('{group}', 'Ready').split(':')[0]);
  await runAt(ann, '2099-12-10T10:00:00.000Z', { editionIds });
  const soon = (await mailsTo(ann.email, 'reminderReadyToDraw'))[1];
  expect(soon.text).toContain("names aren't drawn yet");
  ok(await ann.trpc.mutate('draw.run', { groupSlug: group.slug, editionNumber: 1 }));
  await runAt(ann, '2099-12-17T10:00:00.000Z', { editionIds });
  expect(await count(ann, 'reminderReadyToDraw'), 'drawn: no more').toBe(2);
});

test('join digest: the morning after, who joined through the link (not email invitees), once; opt-out', async ({ signIn, db }) => {
  const [ann, bob, cee, dee, olive] = await Promise.all(['ann', 'bob', 'cee', 'dee', 'olive'].map((name) => signIn(name)));
  const create = (user: User, name: string, organizerName: string) =>
    user.trpc.mutate('group.create', { name, organizerName, timeZone: 'Europe/Brussels', giftDay: { date: '2099-12-24' }, exchangeMode: 'inPerson' });
  const [first, second] = [ok(await create(ann, 'Digest', 'Ann')), ok(await create(olive, 'Overzicht', 'Olive'))];
  for (const [user, name] of [[bob, 'Bob'], [cee, 'Cee']] as const) ok(await user.trpc.mutate('join.accept', { groupSlug: first.slug, token: first.joinToken, name }));
  ok(await bob.trpc.mutate('join.accept', { groupSlug: second.slug, token: second.joinToken, name: 'Bob' }));
  ok(await ann.trpc.mutate('invite.send', { groupSlug: first.slug, email: dee.email }));
  const token = (await mailsTo(dee.email)).at(-1)!.text.match(/[?&]invite=([A-Za-z0-9_-]+)/)![1];
  ok(await dee.trpc.mutate('invite.accept', { groupSlug: first.slug, token, name: 'Dee' }));
  await db.users.updateOne({ email: olive.email }, { $set: { locale: 'nl' } });
  const groupIds = await Promise.all([first, second].map(async ({ slug }) => (await db.groups.findOne({ slug }))!._id));
  const tomorrow = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels' }).format(new Date(Date.now() + 24 * 3600_000));

  await runAt(ann, `${tomorrow}T05:00:00.000Z`, { groupIds });
  expect(await count(ann, 'joinDigest'), 'not before 08:00 local').toBe(0);
  await runAt(ann, `${tomorrow}T10:00:00.000Z`, { groupIds });
  await runAt(ann, `${tomorrow}T11:00:00.000Z`, { groupIds });
  const [digest, ...more] = await mailsTo(ann.email, 'joinDigest');
  expect(more).toHaveLength(0);
  expect(digest.subject).toBe('2 people joined Digest');
  expect(digest.text).toContain('Bob');
  expect(digest.text).toContain('Cee');
  expect(digest.text, 'email invitees are not in it').not.toContain('Dee');
  const [dutch] = await mailsTo(olive.email, 'joinDigest');
  expect(dutch.subject).toBe('Bob doet mee met Overzicht');

  // Dee organizes too, but turned the digest off.
  ok(await dee.trpc.mutate('account.setNotifications', { reminders: true, wishlistUpdates: true, santaMessages: true, nextYear: true, joins: false }));
  const quiet = ok(await create(dee, 'Quiet', 'Dee'));
  ok(await cee.trpc.mutate('join.accept', { groupSlug: quiet.slug, token: quiet.joinToken, name: 'Cee' }));
  await runAt(ann, `${tomorrow}T12:00:00.000Z`, { groupIds: [(await db.groups.findOne({ slug: quiet.slug }))!._id] });
  expect(await count(dee, 'joinDigest'), 'opted out').toBe(0);
});
