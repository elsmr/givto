// Notifications smoke (S7: 14, 29, 30, 35, 52, 54, 55) against a running app
// (tests/env.sh s7 4701 27057 4791). Groups and editions are seeded in Mongo; jobs run through
// the cron endpoint, emails are read back from the mail mock.
// Run: BASE_URL=… MAIL_URL=… MONGO_CONTAINER=… pnpm test:smoke:s7
import assert from 'node:assert/strict';
import { createHmac, randomBytes } from 'node:crypto';

process.env.BASE_URL ??= 'http://localhost:4701';
process.env.MAIL_URL ??= 'http://localhost:4791';
process.env.MONGO_CONTAINER ??= 'givto-mongo-s7';
const { as, mongo, signIn, step } = await import('./smoke-s2-client.mjs');
const BASE = process.env.BASE_URL;
const CRON_SECRET = process.env.CRON_SECRET ?? 'test-cron-secret';
const WEBHOOK_KEY = process.env.MAILGUN_WEBHOOK_SIGNING_KEY ?? 'test-webhook-signing-key';

const id = () => randomBytes(12).toString('hex');
const DAY = 24 * 3600_000;
const dataOf = (result) => {
  assert.equal(result.status, 200, JSON.stringify(result.error));
  return result.data;
};
const cron = async (job, auth = `Bearer ${CRON_SECRET}`) => {
  const res = await fetch(`${BASE}/api/cron/${job}`, { headers: auth ? { authorization: auth } : {} });
  return { status: res.status, body: await res.json().catch(() => null) };
};
const run = async (job) => {
  const { status, body } = await cron(job);
  assert.equal(status, 200, JSON.stringify(body));
  return body.result;
};
const allMails = async (email) => (await fetch(`${process.env.MAIL_URL}/messages?to=${encodeURIComponent(email)}`)).json();
const mails = async (user, tag, group) =>
  (await allMails(user.email)).filter((m) => m.tags.includes(tag) && (!group || m.text.includes(group)));

/** Mongo documents with real Dates (EJSON), so the app reads them like its own. */
const ejson = (doc) => JSON.stringify(JSON.stringify(doc, function (key, value) {
  return this[key] instanceof Date ? { $date: this[key].toISOString() } : value;
}));
const insert = (collection, docs) => mongo(`db.${collection}.insertMany(EJSON.parse(${ejson(docs)}))`);
const today = (timeZone, offsetDays = 0) =>
  new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date(Date.now() + offsetDays * DAY));

const [olive, ann, bob, cee, dan] = await Promise.all(['olive', 'ann', 'bob', 'cee', 'dan'].map(signIn));
const member = (user, name, extra = {}) => ({
  id: id(), ...(user && { userId: user.id }), name, role: 'member', status: 'joined', joinedAt: new Date(),
  wishlistView: { includeNewWishes: true, hiddenWishIds: [] }, ...extra,
});
const groupDoc = (name, members, extra = {}) => ({
  _id: id(), slug: `s7${id().slice(0, 10)}`, name, locale: 'en', defaults: { timeZone: 'Europe/Brussels', exchangeMode: 'inPerson' },
  createdBy: olive.id, members, exclusions: [], households: [], createdAt: new Date(), updatedAt: new Date(), ...extra,
});
const editionDoc = (group, number, status, people, extra = {}) => ({
  _id: id(), groupId: group._id, number, year: 2026, title: `Secret Santa ${number}`, timeZone: 'Europe/Brussels',
  exchangeMode: 'inPerson', avoidPreviousGiftees: false, status, statusChangedAt: {}, reveal: { enabled: false },
  participants: people.map((p) => ({ memberId: p.id, participates: true, status: 'joined', addedAt: new Date() })),
  createdAt: new Date(), updatedAt: new Date(), ...extra,
});
const drawOf = (pairs) => ({ assignments: Object.fromEntries(pairs.map(([s, g]) => [s.id, g.id])), drawnAt: new Date(), history: [] });

// Family: Olive organizes and manages Kid; Dan asks to join through the link. Locale nl, so
// people without an account get Dutch; account holders get their own language.
const m = { olive: member(olive, 'Olive', { role: 'organizer' }), ann: member(ann, 'Ann'), bob: member(bob, 'Bob'), cee: member(cee, 'Cee') };
m.kid = member(null, 'Kid', { managedBy: m.olive.id });
const linkToken = randomBytes(18).toString('base64url');
const family = groupDoc('Family', Object.values(m), { locale: 'nl', joinLink: { token: linkToken, revoked: false, requiresApproval: true, createdAt: new Date() } });
const giftDay = today('Europe/Brussels', 10);
const e1 = editionDoc(family, 1, 'drawn', Object.values(m), {
  giftDay: { date: giftDay },
  draw: drawOf([[m.olive, m.ann], [m.ann, m.bob], [m.bob, m.cee], [m.cee, m.kid], [m.kid, m.olive]]),
});
insert('groups', [family]);
insert('editions', [e1]);
const E1 = { groupSlug: family.slug, editionNumber: 1 };
mongo(`db.users.updateOne({ email: '${dan.email}' }, { $set: { locale: 'nl' } })`);

await step('cron: secret required, unknown jobs 404', async () => {
  assert.equal((await cron('deliveries', null)).status, 401);
  assert.equal((await cron('deliveries', 'Bearer nope')).status, 401);
  assert.equal((await cron('nope')).status, 404);
});

await step('join request emails the organizer', async () => {
  assert.equal(dataOf(await as(dan).mutate('join.accept', { groupSlug: family.slug, token: linkToken, name: 'Dan' })).status, 'requested');
  const [request] = await mails(olive, 'joinRequest');
  assert.match(request.subject, /^Dan wants to join Family$/);
  const danId = JSON.parse(mongo(`JSON.stringify(db.groups.findOne({ _id: '${family._id}' }).members.find((m) => m.name === 'Dan'))`)).id;
  m.dan = { id: danId };
});

await step('names drawn: one email per Santa, once, never naming the giftee; managed members via their manager', async () => {
  const first = await run('deliveries');
  assert.equal(first.draws.sent, 5, JSON.stringify(first));
  assert.equal((await run('deliveries')).draws.done, 5, 'second tick sends nothing');
  for (const [user, giftee] of [[ann, 'Bob'], [bob, 'Cee'], [cee, 'Kid']]) {
    const [mail, ...more] = await mails(user, 'namesDrawn');
    assert.equal(more.length, 0);
    assert.ok(!mail.text.includes(giftee) && !mail.html.includes(giftee) && !mail.subject.includes(giftee), `${giftee} named`);
    assert.ok(mail.text.includes(`/g/${family.slug}`));
  }
  const oliveMails = await mails(olive, 'namesDrawn');
  assert.equal(oliveMails.length, 2, 'her own and Kid\'s');
  assert.ok(oliveMails.some((mail) => mail.text.includes('For Kid')));
});

await step('late joiner is approved and slots in (Ann → Dan → Bob): "you\'re in" in Dutch, only Ann hears "new giftee", Dan gets the draw email', async () => {
  // Approval after the draw slots Dan in at a random place (S4); pin the place so later steps can rely on it.
  dataOf(await as(olive).mutate('membership.approve', { groupSlug: family.slug, memberId: m.dan.id }));
  const joined = await mails(dan, 'joined');
  assert.equal(joined.length, 1);
  assert.match(joined[0].subject, /^Je doet mee: Family$/, 'Dan reads Dutch');
  const draw = drawOf([[m.olive, m.ann], [m.ann, m.dan], [m.dan, m.bob], [m.bob, m.cee], [m.cee, m.kid], [m.kid, m.olive]]);
  mongo(`db.editions.updateOne({ _id: '${e1._id}' }, { $set: { draw: EJSON.parse(${ejson(draw)}) } })`);
  const result = await run('deliveries');
  assert.equal(result.draws.sent, 2, JSON.stringify(result));
  assert.equal((await mails(ann, 'gifteeChanged')).length, 1);
  assert.match((await mails(dan, 'namesDrawn'))[0].subject, /namen zijn getrokken/);
  for (const user of [olive, bob, cee]) assert.equal((await mails(user, 'gifteeChanged')).length, 0);
});

const bobSecrets = [bob.email, bob.id, 'Bob'];
const assertAnonymous = (mail) => {
  const all = JSON.stringify(mail);
  for (const secret of [...bobSecrets, m.bob.id]) assert.ok(!all.includes(secret), `leaks ${secret}`);
};

let psst;
await step('Psst!: emailed at its delivery slot, once, with nothing about the Santa', async () => {
  dataOf(await as(bob).mutate('nudge.send', { ...E1, kind: 'emptyWishlist' }));
  await run('deliveries');
  assert.equal((await mails(cee, 'psst')).length, 0, 'not before the slot');
  mongo(`db.nudges.updateMany({ editionId: '${e1._id}' }, { $set: { sendAfter: new Date(Date.now() - 1000) } })`);
  assert.equal((await run('deliveries')).psst.sent, 1);
  await run('deliveries');
  [psst] = await mails(cee, 'psst');
  assert.equal((await mails(cee, 'psst')).length, 1);
  assertAnonymous(psst);
  assert.equal(psst.from, (await mails(cee, 'namesDrawn'))[0].from, 'same sender as every email');
  assert.match(psst.headers['List-Unsubscribe'], /^<http:\/\/localhost:\d+\/api\/unsubscribe\?t=[0-9a-f]{24}\.santaMessages\.[\w-]+>$/);
  assert.equal(psst.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
  assert.ok(psst.headers['List-Unsubscribe'].includes(cee.id), 'the token is the recipient\'s');
});

await step('question to the giftee, answer to the Santa: once each, the question without the asker', async () => {
  const { id: questionId } = dataOf(await as(bob).mutate('question.ask', { ...E1, text: 'What size are your feet?' }));
  mongo(`db.questions.updateMany({ editionId: '${e1._id}' }, { $set: { notifyAfter: new Date(Date.now() - 1000) } })`);
  assert.equal((await run('deliveries')).questions.sent, 1);
  const [question, ...more] = await mails(cee, 'question');
  assert.equal(more.length, 0);
  assert.ok(question.text.includes('What size are your feet?'));
  assertAnonymous(question);
  dataOf(await as(cee).mutate('question.answer', { ...E1, questionId, text: 'Size 39' }));
  assert.equal((await run('deliveries')).answers.sent, 1);
  await run('deliveries');
  const answers = await mails(bob, 'answer');
  assert.equal(answers.length, 1);
  assert.ok(answers[0].text.includes('Size 39') && !answers[0].text.includes('Cee'));
});

await step('one-click unsubscribe: POST only, signed; the opt-out is respected', async () => {
  const oneClick = psst.headers['List-Unsubscribe'].slice(1, -1);
  assert.equal((await fetch(oneClick)).status, 405, 'GET changes nothing');
  assert.equal((await fetch(oneClick.replace(/.$/, (c) => (c === 'a' ? 'b' : 'a')), { method: 'POST' })).status, 400, 'tampered');
  assert.equal((await fetch(oneClick.replace(cee.id, bob.id), { method: 'POST' })).status, 400, 'someone else');
  const res = await fetch(oneClick, { method: 'POST', body: 'List-Unsubscribe=One-Click', headers: { 'content-type': 'application/x-www-form-urlencoded' } });
  assert.equal(res.status, 200);
  assert.equal(dataOf(await as(cee).query('me.get')).notifications.santaMessages, false);
  assert.ok(psst.html.includes(`/unsubscribe?t=${oneClick.split('t=')[1]}`), 'footer link to the page');
  dataOf(await as(bob).mutate('question.ask', { ...E1, text: 'Favourite colour?' }));
  mongo(`db.questions.updateMany({ editionId: '${e1._id}' }, { $set: { notifyAfter: new Date(Date.now() - 1000) } })`);
  assert.equal((await run('deliveries')).questions.optedOut, 1);
  assert.equal((await mails(cee, 'question')).length, 1);
  assert.equal(mongo(`db.questions.countDocuments({ editionId: '${e1._id}', notifiedAt: { $exists: false } })`), '0', 'in-app delivery still marked');
});

const pendingDigest = (set) => mongo(`db.wishlistNotifications.updateOne({ editionId: '${e1._id}', gifteeMemberId: '${m.ann.id}' }, { $set: ${set} })`);
const digestNow = () => pendingDigest(`{ notifyAfter: new Date(Date.now() - 1000) }`);
await step('wishlist digest: 3 quick adds → one email after the quiet period, listing them', async () => {
  for (const title of ['Moomin mug', 'Green socks', 'A good novel']) dataOf(await as(ann).mutate('wish.create', { title }));
  assert.equal((await run('digests')).sent, undefined, 'quiet period');
  digestNow();
  assert.equal((await run('digests')).sent, 1);
  assert.equal((await run('digests')).sent, undefined);
  const [digest, ...more] = await mails(olive, 'wishlistUpdated');
  assert.equal(more.length, 0);
  for (const title of ['Moomin mug', 'Green socks', 'A good novel']) assert.ok(digest.text.includes(title), title);
  assert.match(digest.headers['List-Unsubscribe'], /wishlistUpdates/);
});

await step('wishlist digest: add + delete, reorder, a hidden wish, or a Santa who already looked → nothing', async () => {
  const wish = dataOf(await as(ann).mutate('wish.create', { title: 'Gone again' }));
  dataOf(await as(ann).mutate('wish.delete', { wishId: wish.id }));
  digestNow();
  assert.equal((await run('digests')).noChanges, 1);
  const [first] = dataOf(await as(ann).query('wish.list'));
  dataOf(await as(ann).mutate('wish.move', { wishId: first.id, toIndex: 2 }));
  const hidden = dataOf(await as(ann).mutate('wish.create', { title: 'Secret wish' }));
  dataOf(await as(ann).mutate('wish.setHidden', { groupSlug: family.slug, wishId: hidden.id, hidden: true }));
  digestNow();
  assert.equal((await run('digests')).noChanges, 1, 'hidden in this group');
  dataOf(await as(ann).mutate('wish.create', { title: 'Seen it' }));
  dataOf(await as(olive).query('claim.gifteeWishlist', E1));
  digestNow();
  assert.equal((await run('digests')).seen, 1);
  assert.equal((await mails(olive, 'wishlistUpdated')).length, 1);
});

await step('wishlist digest: constant editing still sends at the cap', async () => {
  const wish = dataOf(await as(ann).mutate('wish.create', { title: 'Edited a lot' }));
  pendingDigest(`{ firstChangeAt: new Date(Date.now() - 25 * 3600 * 1000) }`);
  dataOf(await as(ann).mutate('wish.update', { wishId: wish.id, title: 'Edited a lot, again' }));
  assert.equal((await run('digests')).sent, 1, 'no waiting for quiet');
  assert.ok((await mails(olive, 'wishlistUpdated'))[1].text.includes('Edited a lot, again'));
});

await step('organizer handover: the new organizer hears it once', async () => {
  mongo(`db.groups.updateOne({ _id: '${family._id}' }, { $set: { organizerHandover: { toMemberId: '${m.ann.id}', at: new Date() } } })`);
  assert.equal((await run('deliveries')).handovers.sent, 1);
  await run('deliveries');
  assert.equal((await mails(ann, 'organizerHandover')).length, 1);
});

// Reminder editions, each at a different point of its timeline.
const morningZone = Array.from({ length: 27 }, (_, i) => i - 12)
  .map((offset) => (offset === 0 ? 'Etc/GMT' : `Etc/GMT${offset > 0 ? '+' : ''}${offset}`))
  .find((zone) => Number(new Intl.DateTimeFormat('en-US', { timeZone: zone, hour: 'numeric', hourCycle: 'h23' }).format(new Date())) === 9);
const trio = () => [member(olive, 'Olive', { role: 'organizer' }), member(ann, 'Ann'), member(bob, 'Bob')];
const circle = (people) => drawOf(people.map((p, i) => [p, people[(i + 1) % people.length]]));
const gifts = trio(), posts = trio(), party = trio();
const giftsGroup = groupDoc('Gifts', gifts), postsGroup = groupDoc('Posts', posts), partyGroup = groupDoc('Party', party);
const inviteeEmail = `s7-invitee-${Date.now()}@example.test`;
const invitee = member(null, 'Ivy', { status: 'invited', invitedAt: new Date(Date.now() - 4 * DAY) });
family.members.push(invitee);
mongo(`db.groups.updateOne({ _id: '${family._id}' }, { $push: { members: EJSON.parse(${ejson(invitee)}) } })`);
insert('invites', [{ _id: id(), groupId: family._id, memberId: invitee.id, email: inviteeEmail, tokenHash: 'old', createdAt: new Date(Date.now() - 4 * DAY), expiresAt: new Date(Date.now() + 3 * DAY) }]);
insert('groups', [giftsGroup, postsGroup, partyGroup]);
insert('editions', [
  editionDoc(giftsGroup, 1, 'drawn', gifts, { giftDay: { date: today('Europe/Brussels', 5) }, draw: circle(gifts) }),
  editionDoc(postsGroup, 1, 'drawn', posts, { exchangeMode: 'byPost', postBy: today('Europe/Brussels', 1), giftDay: { date: today('Europe/Brussels', 6) }, draw: circle(posts) }),
  editionDoc(partyGroup, 1, 'drawn', party, { timeZone: morningZone, giftDay: { date: today(morningZone), time: '19:30', place: 'The barn' }, draw: circle(party) }),
]);

await step('reminders: wishlist (empty only, opt-out respected), gift, post-by, gift day morning, join; each once', async () => {
  dataOf(await as(bob).mutate('account.setNotifications', { reminders: false, wishlistUpdates: true, santaMessages: true, nextYear: true }));
  mongo(`db.emailSuppressions.insertOne({ _id: '${ann.email}', reason: 'bounce', at: new Date() })`);
  await run('reminders');
  await run('reminders');
  const count = async (user, tag, group) => (await mails(user, tag, group)).length;
  const wishlistReminders = await Promise.all([olive, cee, ann, bob].map((user) => count(user, 'reminderWishlist', 'Family')));
  assert.deepEqual(wishlistReminders, [2, 1, 0, 0], 'Olive also for Kid; Ann has wishes; Bob opted out');
  assert.match((await mails(olive, 'reminderWishlist', 'Family')).map((mail) => mail.text).join(), /For Kid/);
  assert.equal(await count(olive, 'reminderGift', 'Gifts'), 1);
  assert.equal(await count(olive, 'reminderPost', 'Posts'), 1);
  assert.match((await mails(olive, 'reminderPost'))[0].subject, /^Post your gift by /);
  assert.equal(await count(olive, 'reminderGiftDay', 'Party'), 1);
  assert.ok((await mails(olive, 'reminderGiftDay'))[0].text.includes('The barn'));
  assert.equal(await count(ann, 'reminderGiftDay'), 0, 'suppressed address');
  assert.equal(await count(bob, 'reminderGift'), 0, 'opted out');
  const join = await allMails(inviteeEmail);
  assert.equal(join.length, 1);
  assert.match(join[0].subject, /^Doe je nog mee met Family\?$/, 'group language without an account');
  const token = join[0].text.match(/invite=([\w-]+)/)[1];
  assert.ok(dataOf(await as(olive).query('invite.preview', { groupSlug: family.slug, token })), 'the fresh link works');
});

await step('Mailgun webhook: signature checked; hard bounces and complaints suppress', async () => {
  const post = (body) => fetch(`${BASE}/api/webhooks/mailgun`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const signed = (event, timestamp = Math.floor(Date.now() / 1000)) => {
    const token = randomBytes(16).toString('hex');
    const signature = createHmac('sha256', WEBHOOK_KEY).update(`${timestamp}${token}`).digest('hex');
    return { signature: { timestamp: String(timestamp), token, signature }, 'event-data': event };
  };
  const bounce = { event: 'failed', severity: 'permanent', recipient: dan.email };
  assert.equal((await post({ 'event-data': bounce })).status, 406);
  assert.equal((await post({ ...signed(bounce), signature: { ...signed(bounce).signature, signature: 'f'.repeat(64) } })).status, 406);
  assert.equal((await post(signed(bounce, Math.floor(Date.now() / 1000) - 3600))).status, 406, 'replayed');
  assert.equal(mongo(`db.emailSuppressions.countDocuments({ _id: '${dan.email}' })`), '0');
  assert.equal((await post(signed({ event: 'failed', severity: 'temporary', recipient: dan.email }))).status, 200);
  assert.equal(mongo(`db.emailSuppressions.countDocuments({ _id: '${dan.email}' })`), '0', 'temporary failures don\'t count');
  assert.equal((await post(signed(bounce))).status, 200);
  assert.equal((await post(signed({ event: 'complained', recipient: cee.email.toUpperCase() }))).status, 200);
  assert.equal(mongo(`db.emailSuppressions.countDocuments({ _id: { $in: ['${dan.email}', '${cee.email}'] } })`), '2');
});

await step('retention: addresses after gift day; messages after 3 months; old draws; orphan images', async () => {
  const old = trio();
  const oldGroup = groupDoc('Old', old);
  const address = { lines: ['Main street 1'], postalCode: '1000', city: 'Brussels', country: 'BE' };
  const withAddress = (edition) => ({ ...edition, participants: edition.participants.map((p) => ({ ...p, address })) });
  const past = withAddress(editionDoc(oldGroup, 1, 'drawn', old, { giftDay: { date: today('UTC', -120) }, draw: circle(old) }));
  const recent = withAddress(editionDoc(oldGroup, 2, 'drawn', old, { giftDay: { date: today('UTC', -2) }, draw: circle(old) }));
  insert('groups', [oldGroup]);
  insert('editions', [past, recent]);
  for (const edition of [past, recent]) {
    insert('tips', [{ _id: id(), editionId: edition._id, authorMemberId: old[0].id, aboutMemberId: old[1].id, text: 'Tip', anonymous: false, createdAt: new Date(), updatedAt: new Date() }]);
  }
  const imageId = () => `ObjectId('${id()}')`;
  const [orphan, used] = [imageId(), imageId()];
  mongo(`db.getCollection('wishImages.files').insertMany([${orphan}, ${used}].map((_id) => ({ _id, length: 0, chunkSize: 261120, uploadDate: new Date(Date.now() - 25 * 3600 * 1000), filename: 'wish-image', metadata: { ownerId: '${ann.id}', contentType: 'image/png' } })))`);
  mongo(`db.wishes.updateOne({ ownerId: '${ann.id}' }, { $set: { imageId: ${used}.toHexString() } })`);
  const result = await run('retention');
  assert.ok(result.addresses >= 2 && result.editionMessages >= 1 && result.draws >= 1 && result.orphanImages >= 1, JSON.stringify(result));
  const after = (edition) => JSON.parse(mongo(`JSON.stringify(db.editions.findOne({ _id: '${edition._id}' }))`));
  assert.ok(after(past).participants.every((p) => !p.address) && after(recent).participants.every((p) => !p.address));
  assert.equal(after(past).draw, undefined, 'replaced by edition 2\'s draw');
  assert.ok(after(recent).draw);
  assert.equal(mongo(`db.tips.countDocuments({ editionId: { $in: ['${past._id}', '${recent._id}'] } })`), '1', 'only the recent tip stays');
  assert.equal(mongo(`db.getCollection('wishImages.files').countDocuments({ _id: { $in: [${orphan}, ${used}] } })`), '1');
});

await step('retention: bounce records go once no account or pending invite uses the address', async () => {
  const gone = `s7-gone-${Date.now()}@example.test`, declined = `s7-declined-${Date.now()}@example.test`;
  insert('invites', [{ _id: id(), groupId: family._id, memberId: id(), email: declined, tokenHash: `used-${id()}`, createdAt: new Date(), expiresAt: new Date(Date.now() + 3 * DAY), usedAt: new Date() }]);
  const kept = [inviteeEmail, dan.email];
  insert('emailSuppressions', [gone, declined, inviteeEmail].map((_id) => ({ _id, reason: 'bounce', at: new Date() })));
  await run('retention');
  const left = JSON.parse(mongo(`JSON.stringify(db.emailSuppressions.find({ _id: { $in: ${JSON.stringify([gone, declined, ...kept])} } }).toArray().map((s) => s._id).sort())`));
  assert.deepEqual(left, [...kept].sort(), 'pending invite and account keep theirs');
});

await step('retention: an inactive group gets one warning, then goes 30 days later', async () => {
  const people = trio();
  const stale = new Date(Date.now() - 25 * 30 * DAY);
  const sleepy = groupDoc('Sleepy', people, { createdAt: stale, updatedAt: stale });
  insert('groups', [sleepy]);
  insert('editions', [editionDoc(sleepy, 1, 'done', people, { createdAt: stale, updatedAt: stale })]);
  await run('retention');
  await run('retention');
  const warnings = await mails(olive, 'groupDeletionWarning', 'Sleepy');
  assert.equal(warnings.length, 1);
  assert.match(warnings[0].subject, /^Sleepy will be deleted on /);
  assert.equal(mongo(`db.groups.countDocuments({ _id: '${sleepy._id}' })`), '1');
  mongo(`db.sentNotifications.updateOne({ _id: 'groupDeletionWarning:${sleepy._id}' }, { $set: { sentAt: new Date(Date.now() - 31 * 24 * 3600 * 1000) } })`);
  await run('retention');
  assert.equal(mongo(`db.groups.countDocuments({ _id: '${sleepy._id}' }) + db.editions.countDocuments({ groupId: '${sleepy._id}' })`), '0');
});
