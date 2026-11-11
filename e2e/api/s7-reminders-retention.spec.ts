// Notifications (part 2; 29, 54, 55): reminders, the Mailgun webhook,
// retention. Seeded relative to today: the jobs run at real time through the cron endpoint, on the
// whole database, so every check is on this test's own people, groups and editions. Part 1:
// s7-notifications.spec.ts.
import { createHmac, randomBytes } from 'node:crypto';
import { ObjectId } from 'mongodb';
import { newId } from '@/lib/server/db';
import nlEmail from '@/messages/nl/email.json' with { type: 'json' };
import { appEnv, BASE_URL } from '../env';
import { expect, mailsTo, ok, test, uniqueEmail, type User } from '../fixtures';
import { circle, DAY, editionDoc, expectMails, groupDoc, mails, member, run, today } from './s7-seed';

const trio = (olive: User, ann: User, bob: User) => [member(olive, 'Olive', { role: 'organizer' }), member(ann, 'Ann'), member(bob, 'Bob')];

test('reminders at real time: one combined email (wishlist + gift), opt-out, suppression, managed, gift day morning, join; each once', async ({ signIn, db, secrets }) => {
  const [olive, ann, bob, cee] = await Promise.all(['olive', 'ann', 'bob', 'cee'].map((name) => signIn(name)));
  // Family (locale nl): Olive organizes and manages Kid; Ann and Olive have wishes; Ivy is invited without an account.
  const mug = ok(await ann.trpc.mutate('wish.create', { title: 'Moomin mug' }));
  const socks = ok(await olive.trpc.mutate('wish.create', { title: 'Green socks' }));
  const shows = (wish: { id: string }) => ({ wishlistView: { shownWishIds: [wish.id] } });
  const m = { olive: member(olive, 'Olive', { role: 'organizer', ...shows(socks) }), ann: member(ann, 'Ann', shows(mug)), bob: member(bob, 'Bob'), cee: member(cee, 'Cee') };
  const kid = member(null, 'Kid', { managedBy: m.olive.id });
  const invitee = member(null, 'Ivy', { status: 'invited', invitedAt: new Date(Date.now() - 4 * DAY) });
  const inviteeEmail = uniqueEmail('invitee');
  secrets.push(inviteeEmail);
  const family = groupDoc(olive, 'Family', [...Object.values(m), kid, invitee], { locale: 'nl' });
  const people = [...Object.values(m), kid];
  // Open, joined and drawn a month ago, gift day in 10 days: the "14 days before" slots (4 days ago)
  // are this week's, and the "7 days before" ones (in 3 days) come along (lib/reminder-schedule.ts).
  const monthAgo = new Date(Date.now() - 30 * DAY);
  const drawn = editionDoc(family, 1, 'drawn', people, { giftDay: { date: today('Europe/Brussels', 10) }, draw: { ...circle(people), drawnAt: monthAgo } });
  const e1 = { ...drawn, statusChangedAt: { open: monthAgo, drawn: monthAgo }, participants: drawn.participants.map((p) => ({ ...p, addedAt: monthAgo })) };
  const morningZone = Array.from({ length: 27 }, (_, i) => i - 12)
    .map((offset) => (offset === 0 ? 'Etc/GMT' : `Etc/GMT${offset > 0 ? '+' : ''}${offset}`))
    .find((zone) => Number(new Intl.DateTimeFormat('en-US', { timeZone: zone, hour: 'numeric', hourCycle: 'h23' }).format(new Date())) === 9)!;
  const party = trio(olive, ann, bob);
  const partyGroup = groupDoc(olive, 'Party', party, { timeZone: morningZone });
  await db.groups.insertMany([family, partyGroup]);
  await db.invites.insertOne({
    _id: newId(), groupId: family._id, memberId: invitee.id, email: inviteeEmail, tokenHash: `old-${newId()}`,
    createdAt: new Date(Date.now() - 4 * DAY), expiresAt: new Date(Date.now() + 3 * DAY),
  });
  await db.editions.insertMany([
    e1,
    editionDoc(partyGroup, 1, 'drawn', party, { giftDay: { date: today(morningZone), time: '19:30', place: 'The barn' }, draw: circle(party) }),
  ]);

  ok(await bob.trpc.mutate('account.setNotifications', { reminders: false, wishlistUpdates: true, santaMessages: true, nextYear: true }));
  await db.emailSuppressions.insertOne({ _id: ann.email, reason: 'bounce', at: new Date() });
  await run('reminders');
  await run('reminders');
  await expectMails(olive, 'reminderGift', 1, 'Family');
  await expectMails(olive, 'reminderCombined', 1, 'Family'); // for Kid: no wishes
  await expectMails(cee, 'reminderCombined', 1, 'Family');
  const [forKid] = await mails(olive, 'reminderCombined', 'Family');
  expect(forKid.text).toMatch(/Voor Kid|For Kid/);
  expect(forKid.subject).toMatch(/ · .* · Family$/);
  for (const user of [ann, bob]) expect((await mailsTo(user.email)).filter((mail) => mail.text.includes('Family')), 'suppressed / opted out').toHaveLength(0);
  expect(await db.sentNotifications.countDocuments({ editionId: e1._id, slots: { $all: ['gift-14', 'gift-7'] } }), 'Olive, Kid, Cee; the 7-day ones came along').toBe(3);
  await expectMails(olive, 'reminderGiftDay', 1, 'Party');
  expect((await mails(olive, 'reminderGiftDay'))[0].text).toContain('The barn');
  expect(await mails(ann, 'reminderGiftDay'), 'suppressed address').toHaveLength(0);
  await expect.poll(async () => (await mailsTo(inviteeEmail)).length).toBe(1);
  const [join] = await mailsTo(inviteeEmail);
  expect(join.subject, 'group language without an account').toBe(nlEmail['join-reminder'].subject.replace('{group}', 'Family'));
  const token = join.text.match(/invite=([\w-]+)/)![1];
  secrets.push(token);
  expect(ok(await olive.trpc.query('invite.preview', { groupSlug: family.slug, token })), 'the fresh link works').toBeTruthy();
});

test('Mailgun webhook: signature checked; hard bounces and complaints suppress', async ({ signIn, db }) => {
  const [cee, dan] = await Promise.all([signIn('cee'), signIn('dan')]);
  const post = (body: object) =>
    fetch(`${BASE_URL}/api/webhooks/mailgun`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const signed = (event: object, timestamp = Math.floor(Date.now() / 1000)) => {
    const token = randomBytes(16).toString('hex');
    const signature = createHmac('sha256', appEnv.MAILGUN_WEBHOOK_SIGNING_KEY).update(`${timestamp}${token}`).digest('hex');
    return { signature: { timestamp: String(timestamp), token, signature }, 'event-data': event };
  };
  const suppressed = (emails: string[]) => db.emailSuppressions.countDocuments({ _id: { $in: emails } });
  const bounce = { event: 'failed', severity: 'permanent', recipient: dan.email };
  expect((await post({ 'event-data': bounce })).status).toBe(406);
  expect((await post({ ...signed(bounce), signature: { ...signed(bounce).signature, signature: 'f'.repeat(64) } })).status).toBe(406);
  expect((await post(signed(bounce, Math.floor(Date.now() / 1000) - 3600))).status, 'replayed').toBe(406);
  expect(await suppressed([dan.email])).toBe(0);
  expect((await post(signed({ event: 'failed', severity: 'temporary', recipient: dan.email }))).status).toBe(200);
  expect(await suppressed([dan.email]), "temporary failures don't count").toBe(0);
  expect((await post(signed(bounce))).status).toBe(200);
  expect((await post(signed({ event: 'complained', recipient: cee.email.toUpperCase() }))).status).toBe(200);
  expect(await suppressed([dan.email, cee.email])).toBe(2);
});

test('retention: addresses after gift day; messages after 3 months; old draws; orphan images', async ({ signIn, db }) => {
  const [olive, ann, bob] = await Promise.all(['olive', 'ann', 'bob'].map((name) => signIn(name)));
  const old = trio(olive, ann, bob);
  const oldGroup = groupDoc(olive, 'Old', old);
  const address = { lines: ['Main street 1'], postalCode: '1000', city: 'Brussels', country: 'BE' as const };
  const withAddress = (edition: ReturnType<typeof editionDoc>) => ({ ...edition, participants: edition.participants.map((p) => ({ ...p, address })) });
  const past = withAddress(editionDoc(oldGroup, 1, 'drawn', old, { giftDay: { date: today('UTC', -120) }, draw: circle(old) }));
  const recent = withAddress(editionDoc(oldGroup, 2, 'drawn', old, { giftDay: { date: today('UTC', -2) }, draw: circle(old) }));
  await db.groups.insertOne(oldGroup);
  await db.editions.insertMany([past, recent]);
  for (const edition of [past, recent]) {
    await db.tips.insertOne({
      _id: newId(), editionId: edition._id, authorMemberId: old[0].id, aboutMemberId: old[1].id, text: 'Tip', anonymous: false, createdAt: new Date(), updatedAt: new Date(),
    });
    await db.guesses.insertOne({ _id: newId(), editionId: edition._id, guesserMemberId: old[1].id, guessedMemberId: old[2].id, createdAt: new Date() });
  }
  const wish = ok(await ann.trpc.mutate('wish.create', { title: 'With a picture' }));
  const [orphan, used] = [new ObjectId(), new ObjectId()];
  const images = db.raw.collection('wishImages.files');
  await images.insertMany(
    [orphan, used].map((_id) => ({
      _id, length: 0, chunkSize: 261120, uploadDate: new Date(Date.now() - 25 * 3600 * 1000), filename: 'wish-image',
      metadata: { ownerId: ann.id, contentType: 'image/png' },
    }))
  );
  await db.wishes.updateOne({ _id: wish.id }, { $set: { links: [{ url: 'https://shop.test/lamp' }, { url: 'https://shop.test/lamp-2', imageId: used.toHexString() }] } });
  const result = await run('retention');
  // Counts cover the whole database (a parallel run may have done ours): the shape here, our documents below.
  for (const key of ['addresses', 'editionMessages', 'draws', 'orphanImages']) expect(typeof result[key], JSON.stringify(result)).toBe('number');
  const after = async (edition: { _id: string }) => (await db.editions.findOne({ _id: edition._id }))!;
  expect((await after(past)).participants.every((p) => !p.address) && (await after(recent)).participants.every((p) => !p.address)).toBe(true);
  expect((await after(past)).draw, "replaced by edition 2's draw").toBeUndefined();
  expect((await after(recent)).draw).toBeTruthy();
  expect(await db.tips.countDocuments({ editionId: { $in: [past._id, recent._id] } }), 'only the recent tip stays').toBe(1);
  expect(await db.guesses.countDocuments({ editionId: { $in: [past._id, recent._id] } }), 'only the recent guess stays').toBe(1);
  expect(await images.countDocuments({ _id: { $in: [orphan, used] } })).toBe(1);
});

test('retention: a draw without a gift day goes after 24 months', async ({ signIn, db }) => {
  const [olive, ann, bob] = await Promise.all(['olive', 'ann', 'bob'].map((name) => signIn(name)));
  const people = trio(olive, ann, bob);
  const [oldGroup, liveGroup] = [groupDoc(olive, 'Old, no gift day', people), groupDoc(olive, 'Live, no gift day', people)];
  const old = editionDoc(oldGroup, 1, 'done', people, { draw: { ...circle(people), drawnAt: new Date(Date.now() - 25 * 30 * DAY) } });
  const live = editionDoc(liveGroup, 1, 'drawn', people, { draw: { ...circle(people), drawnAt: new Date(Date.now() - 30 * DAY) } });
  await db.groups.insertMany([oldGroup, liveGroup]);
  await db.editions.insertMany([old, live]);
  await run('retention');
  const after = async (edition: { _id: string }) => (await db.editions.findOne({ _id: edition._id }))!;
  expect((await after(old)).draw).toBeUndefined();
  expect((await after(live)).draw).toBeTruthy();
});

test('retention without a gift day: counted from done or the next edition; the live one keeps its data', async ({ signIn, db }) => {
  const [olive, ann, bob] = await Promise.all(['olive', 'ann', 'bob'].map((name) => signIn(name)));
  const people = trio(olive, ann, bob);
  const [nextGroup, doneGroup] = [groupDoc(olive, 'Superseded, no gift day', people), groupDoc(olive, 'Done, no gift day', people)];
  const address = { lines: ['Main street 1'], postalCode: '1000', city: 'Brussels', country: 'BE' as const };
  const seeded = (group: ReturnType<typeof groupDoc>, number: number, status: 'drawn' | 'done', extra: Partial<ReturnType<typeof editionDoc>>) => {
    const edition = editionDoc(group, number, status, people, { draw: circle(people), ...extra });
    return { ...edition, participants: edition.participants.map((p) => ({ ...p, address })) };
  };
  const monthsAgo = (months: number) => new Date(Date.now() - months * 30 * DAY);
  const superseded = seeded(nextGroup, 1, 'drawn', { createdAt: monthsAgo(6) });
  const live = seeded(nextGroup, 2, 'drawn', { createdAt: monthsAgo(4) });
  const doneLongAgo = seeded(doneGroup, 1, 'done', { statusChangedAt: { done: monthsAgo(4) } });
  const doneRecently = seeded(doneGroup, 2, 'done', { statusChangedAt: { done: monthsAgo(1) } });
  const editions = [superseded, live, doneLongAgo, doneRecently];
  await db.groups.insertMany([nextGroup, doneGroup]);
  await db.editions.insertMany(editions);
  for (const edition of editions) {
    const base = { _id: newId(), editionId: edition._id, createdAt: monthsAgo(5) };
    await db.claims.insertOne({ ...base, wishId: newId(), ownerId: ann.id, santaMemberId: people[0].id });
    await db.tips.insertOne({ ...base, _id: newId(), authorMemberId: people[0].id, aboutMemberId: people[1].id, text: 'Tip', anonymous: false, updatedAt: base.createdAt });
    await db.guesses.insertOne({ ...base, _id: newId(), guesserMemberId: people[1].id, guessedMemberId: people[2].id });
  }
  await run('retention');
  const after = async (edition: { _id: string }) => (await db.editions.findOne({ _id: edition._id }))!;
  const hasAddresses = async (edition: { _id: string }) => (await after(edition)).participants.some((p) => p.address);
  expect(await Promise.all(editions.map(hasAddresses)), 'only the live edition keeps addresses').toEqual([false, true, false, false]);
  const kept = async ({ _id: editionId }: { _id: string }) =>
    (await db.claims.countDocuments({ editionId })) + (await db.tips.countDocuments({ editionId })) + (await db.guesses.countDocuments({ editionId }));
  expect(await Promise.all(editions.map(kept)), 'claims, tips and guesses: 3 months after the end').toEqual([0, 3, 0, 3]);
  expect((await after(superseded)).draw, "replaced by edition 2's draw").toBeUndefined();
  expect((await after(live)).draw).toBeTruthy();
});

test('retention: bounce records go once no account or pending invite uses the address', async ({ signIn, db, secrets }) => {
  const [olive, dan] = await Promise.all([signIn('olive'), signIn('dan')]);
  const group = groupDoc(olive, 'Bounces', [member(olive, 'Olive', { role: 'organizer' })]);
  await db.groups.insertOne(group);
  const [gone, declined, invitee] = [uniqueEmail('gone'), uniqueEmail('declined'), uniqueEmail('invitee')];
  secrets.push(gone, declined, invitee);
  const invite = (email: string, extra = {}) => ({
    _id: newId(), groupId: group._id, memberId: newId(), email, tokenHash: `t-${newId()}`, createdAt: new Date(), expiresAt: new Date(Date.now() + 3 * DAY), ...extra,
  });
  await db.invites.insertMany([invite(declined, { usedAt: new Date() }), invite(invitee)]);
  const kept = [invitee, dan.email];
  await db.emailSuppressions.insertMany([gone, declined, ...kept].map((_id) => ({ _id, reason: 'bounce' as const, at: new Date() })));
  await run('retention');
  const left = (await db.emailSuppressions.find({ _id: { $in: [gone, declined, ...kept] } }).toArray()).map((s) => s._id).sort();
  expect(left, 'pending invite and account keep theirs').toEqual([...kept].sort());
});

test('retention: an inactive group gets one warning, then goes 30 days later', async ({ signIn, db }) => {
  const [olive, ann, bob] = await Promise.all(['olive', 'ann', 'bob'].map((name) => signIn(name)));
  const people = trio(olive, ann, bob);
  const stale = new Date(Date.now() - 25 * 30 * DAY);
  const sleepy = groupDoc(olive, 'Sleepy', people, { createdAt: stale, updatedAt: stale });
  await db.groups.insertOne(sleepy);
  await db.editions.insertOne(editionDoc(sleepy, 1, 'done', people, { createdAt: stale, updatedAt: stale }));
  await run('retention');
  await run('retention');
  await expectMails(olive, 'groupDeletionWarning', 1, 'Sleepy');
  const [warning] = await mails(olive, 'groupDeletionWarning', 'Sleepy');
  expect(warning.subject).toMatch(/^Sleepy will be deleted on /);
  expect(await db.groups.countDocuments({ _id: sleepy._id })).toBe(1);
  await db.sentNotifications.updateOne({ _id: `groupDeletionWarning:${sleepy._id}` }, { $set: { sentAt: new Date(Date.now() - 31 * DAY) } });
  await run('retention');
  expect((await db.groups.countDocuments({ _id: sleepy._id })) + (await db.editions.countDocuments({ groupId: sleepy._id }))).toBe(0);
});

