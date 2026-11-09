// S5 API smoke: sign-in, passkeys, dashboard, preferences, locale, export, deletion.
// Run against tests/env.sh: BASE_URL=… MAIL_URL=… SERVER_LOG=… MONGO_CONTAINER=… pnpm test:smoke:s5
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomInt } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { daysUntil } from '../components/dashboard/days-until.ts';

const BASE = process.env.BASE_URL ?? 'http://localhost:4101';
const MAIL = process.env.MAIL_URL ?? 'http://localhost:4191';
const SERVER_LOG = process.env.SERVER_LOG;
const MONGO = process.env.MONGO_CONTAINER ?? 'givto-mongo-s5';
const DB = process.env.MONGODB_DB ?? 'givto_test';

const run = Date.now();
const emailFor = (name) => `s5-${name}-${run}@example.test`;
const tokens = [];
const ip = () => `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`;

const step = async (name, fn) => {
  await fn();
  console.log(`ok  ${name}`);
};

const cookiesOf = (res) =>
  res.headers
    .getSetCookie()
    .map((cookie) => cookie.split(';')[0])
    .filter((cookie) => !cookie.endsWith('='))
    .join('; ');

const auth = (path, body, { cookie, headers = {}, method = 'POST' } = {}) =>
  fetch(`${BASE}/api/auth${path}`, {
    method,
    headers: { 'content-type': 'application/json', origin: BASE, 'x-forwarded-for': ip(), ...(cookie && { cookie }), ...headers },
    ...(method === 'POST' && { body: JSON.stringify(body) }),
  });

const trpc = async (path, input, { cookie, mutation = false } = {}) => {
  const payload = JSON.stringify({ json: input ?? null });
  const res = await fetch(`${BASE}/api/trpc/${path}${mutation ? '' : `?input=${encodeURIComponent(payload)}`}`, {
    method: mutation ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json', ...(cookie && { cookie }) },
    ...(mutation && { body: payload }),
  });
  const body = await res.json();
  return { status: res.status, data: body.result?.data?.json, error: body.error?.json };
};

const mailsTo = async (email) => (await fetch(`${MAIL}/messages?to=${encodeURIComponent(email)}`)).json();

const requestSignIn = async (email, headers) => {
  const res = await auth('/sign-in/magic-link', { email, callbackURL: '/groups' }, { headers });
  assert.equal(res.status, 200, await res.text());
  const mail = (await mailsTo(email)).at(-1);
  const otp = mail.text.match(/\b(\d{6})\b/)[1];
  const link = mail.html.match(/href="([^"]*)"/)[1].replaceAll('&amp;', '&');
  const url = new URL(link);
  assert.equal(url.pathname, '/auth/link');
  assert.equal(url.search, '', 'no token in the query string');
  const fragment = new URLSearchParams(url.hash.slice(1));
  assert.equal(fragment.get('callbackURL'), '/groups');
  tokens.push(fragment.get('token'));
  return { otp, token: fragment.get('token'), mail };
};

const withCode = (email, otp, headers) => auth('/sign-in/email-otp', { email, otp }, { headers });
const withToken = (token, headers) => auth('/magic-link/verify-token', { token }, { headers });

const signUp = async (email, headers) => {
  const { otp } = await requestSignIn(email, headers);
  const res = await withCode(email, otp, headers);
  assert.equal(res.status, 200);
  const cookie = cookiesOf(res);
  const me = await trpc('me.get', undefined, { cookie });
  return { cookie, id: me.data.id, email };
};

const mongo = (js) => execFileSync('docker', ['exec', MONGO, 'mongosh', DB, '--quiet', '--eval', js]).toString().trim();

await step('gift day countdown uses the edition time zone', async () => {
  const lateEvening = new Date('2026-12-23T23:30:00Z'); // 24 Dec 00:30 in Brussels
  assert.equal(daysUntil('2026-12-24', 'Europe/Brussels', lateEvening), 0);
  assert.equal(daysUntil('2026-12-24', 'America/New_York', lateEvening), 1);
  assert.equal(daysUntil('2026-12-24', 'UTC', new Date('2026-11-24T10:00:00Z')), 30);
  assert.equal(daysUntil('2026-12-24', 'UTC', new Date('2026-12-26T10:00:00Z')), -2);
});

await step('code sign-in invalidates the link from the same email', async () => {
  const email = emailFor('code');
  const { otp, token } = await requestSignIn(email);
  assert.equal((await withCode(email, otp)).status, 200);
  const link = await withToken(token);
  assert.equal(link.status, 400);
  assert.equal((await link.json()).code, 'INVALID_TOKEN');
});

await step('link sign-in (POST, token in body) invalidates the code', async () => {
  const email = emailFor('link');
  const { otp, token } = await requestSignIn(email);
  const res = await withToken(token);
  assert.equal(res.status, 200);
  const me = await trpc('me.get', undefined, { cookie: cookiesOf(res) });
  assert.equal(me.data.email, email);
  assert.equal((await withCode(email, otp)).status, 400);
});

await step('a resent email replaces the code; the newest code works', async () => {
  const email = emailFor('resend');
  const first = await requestSignIn(email);
  const second = await requestSignIn(email);
  if (first.otp !== second.otp) assert.equal((await withCode(email, first.otp)).status, 400);
  assert.equal((await withCode(email, second.otp)).status, 200);
});

await step('GET /magic-link/verify is closed', async () => {
  const res = await fetch(`${BASE}/api/auth/magic-link/verify?token=${'x'.repeat(32)}`, { redirect: 'manual' });
  assert.equal(res.status, 404);
  assert.equal(cookiesOf(res), '');
});

await step('link landing page loads without the token reaching the server', async () => {
  const res = await fetch(`${BASE}/auth/link`);
  assert.equal(res.status, 200);
});

const ann = await signUp(emailFor('ann'), { 'accept-language': 'nl-NL,nl;q=0.9' });
const bob = await signUp(emailFor('bob'));
const cee = await signUp(emailFor('cee'));

await step('locale: new account takes the browser language; NEXT_LOCALE cookie beats Accept-Language', async () => {
  assert.equal((await trpc('me.get', undefined, { cookie: ann.cookie })).data.locale, 'nl');
  const dee = await signUp(emailFor('dee'), { cookie: 'NEXT_LOCALE=nl', 'accept-language': 'en' });
  assert.equal((await trpc('me.get', undefined, { cookie: dee.cookie })).data.locale, 'nl');
});

await step('locale: the account setting wins for sign-in emails', async () => {
  assert.equal((await trpc('me.setLocale', { locale: 'en' }, { cookie: ann.cookie, mutation: true })).status, 200);
  const { mail } = await requestSignIn(ann.email, { 'accept-language': 'nl' });
  assert.equal(mail.subject, 'Sign in to Givto');
  await trpc('me.setLocale', { locale: 'nl' }, { cookie: ann.cookie, mutation: true });
});

await step('passkeys: list, rename, remove (only your own)', async () => {
  const id = mongo(`db.passkeys.insertOne({ name: 'ann@laptop', publicKey: 'pk', userId: ObjectId('${ann.id}'), credentialID: 'cred-${run}', counter: 0, deviceType: 'singleDevice', backedUp: false, transports: 'internal', createdAt: new Date() }).insertedId.toHexString()`);
  const list = await (await auth('/passkey/list-user-passkeys', null, { cookie: ann.cookie, method: 'GET' })).json();
  assert.deepEqual(list.map((p) => p.id), [id]);
  assert.equal((await auth('/passkey/update-passkey', { id, name: 'Laptop' }, { cookie: ann.cookie })).status, 200);
  assert.equal((await auth('/passkey/update-passkey', { id, name: 'x'.repeat(300) }, { cookie: ann.cookie })).status, 400);
  assert.notEqual((await auth('/passkey/delete-passkey', { id }, { cookie: bob.cookie })).status, 200);
  assert.equal((await auth('/passkey/list-user-passkeys', null, { cookie: ann.cookie, method: 'GET' }).then((r) => r.json()))[0].name, 'Laptop');
  assert.equal((await auth('/passkey/delete-passkey', { id }, { cookie: ann.cookie })).status, 200);
  assert.equal(mongo(`db.passkeys.countDocuments({ userId: ObjectId('${ann.id}') })`), '0');
  mongo(`db.passkeys.insertOne({ name: 'kept', publicKey: 'pk', userId: ObjectId('${ann.id}'), credentialID: 'cred2-${run}', counter: 0, deviceType: 'singleDevice', backedUp: false, createdAt: new Date() })`);
});

await step('name and notification preferences saved', async () => {
  assert.equal((await trpc('account.setName', { name: `Annabel ${run}` }, { cookie: ann.cookie, mutation: true })).status, 200);
  assert.equal((await trpc('account.setName', { name: 'see www.evil.test' }, { cookie: ann.cookie, mutation: true })).status, 400);
  const prefs = { reminders: false, wishlistUpdates: true, santaMessages: false, nextYear: true };
  assert.equal((await trpc('account.setNotifications', prefs, { cookie: ann.cookie, mutation: true })).status, 200);
  const me = (await trpc('me.get', undefined, { cookie: ann.cookie })).data;
  assert.equal(me.name, `Annabel ${run}`);
  assert.deepEqual(me.notifications, prefs);
});

// Seed: "family" (Ann organizer, Bob, Cee, Kid managed by Ann; drawn), "solo" (Ann alone + an
// invitee without an account; open), "other" (Bob and Cee only).
const ids = JSON.parse(
  mongo(`
const id = () => new ObjectId().toHexString();
const now = new Date();
const m = { ann: id(), bob: id(), cee: id(), kid: id(), solo: id(), inv: id(), ob: id(), oc: id() };
const g = { family: id(), solo: id(), other: id() };
const e = { family: id(), solo: id(), other: id() };
const view = { includeNewWishes: true, hiddenWishIds: [] };
const member = (mid, name, extra) => ({ id: mid, name, role: 'member', status: 'joined', joinedAt: now, wishlistView: view, ...extra });
const group = (gid, slug, name, members) => ({ _id: gid, slug, name, locale: 'en', defaults: { timeZone: 'Europe/Brussels', exchangeMode: 'inPerson' }, createdBy: members[0].userId, members, exclusions: [], households: [], createdAt: now, updatedAt: now });
db.groups.insertMany([
  group(g.family, 'fam${run}'.slice(0, 32), 'Family', [
    member(m.ann, 'Annabel ${run}', { userId: '${ann.id}', role: 'organizer', joinedAt: new Date(now - 3e6) }),
    member(m.bob, 'Bob ${run}', { userId: '${bob.id}', joinedAt: new Date(now - 2e6) }),
    member(m.cee, 'Cee ${run}', { userId: '${cee.id}', joinedAt: new Date(now - 1e6) }),
    member(m.kid, 'Kiddo', { managedBy: m.ann }),
  ]),
  group(g.solo, 'solo${run}'.slice(0, 32), 'Solo', [
    member(m.solo, 'Annabel ${run}', { userId: '${ann.id}', role: 'organizer' }),
    member(m.inv, 'Invitee', { status: 'invited' }),
  ]),
  group(g.other, 'oth${run}'.slice(0, 32), 'Other', [
    member(m.ob, 'Bob ${run}', { userId: '${bob.id}', role: 'organizer' }),
    member(m.oc, 'Cee ${run}', { userId: '${cee.id}' }),
  ]),
]);
const participant = (memberId, extra) => ({ memberId, participates: true, status: 'joined', addedAt: now, ...extra });
const edition = (eid, groupId, status, participants, draw) => ({ _id: eid, groupId, number: 1, year: 2026, title: 'Secret Santa 2026', timeZone: 'Europe/Brussels', giftDay: { date: '2026-12-24' }, exchangeMode: 'inPerson', avoidPreviousGiftees: false, status, statusChangedAt: { open: now }, participants, reveal: { enabled: false }, createdAt: now, updatedAt: now, ...(draw && { draw }) });
const assignments = { [m.ann]: m.bob, [m.bob]: m.cee, [m.cee]: m.kid, [m.kid]: m.ann };
db.editions.insertMany([
  edition(e.family, g.family, 'drawn', [participant(m.ann, { address: { lines: ['Annstraat 1'], postalCode: '1000', city: 'Brussel', country: 'BE' } }), participant(m.bob), participant(m.cee), participant(m.kid)], { assignments, drawnAt: now, history: [] }),
  edition(e.solo, g.solo, 'open', [participant(m.solo), participant(m.inv, { status: 'invited' })]),
  edition(e.other, g.other, 'open', [participant(m.ob), participant(m.oc)]),
]);
const wish = (ownerId, title) => ({ _id: id(), ownerId, kind: 'wish', title, reallyWant: false, position: 1, createdAt: now, updatedAt: now });
const w = { ann: wish('${ann.id}', 'Ann wish ${run}'), bob: wish('${bob.id}', 'Bob wish ${run}'), kid: wish(m.kid, 'Kid wish ${run}') };
db.wishes.insertMany(Object.values(w));
db.claims.insertMany([
  { _id: id(), wishId: w.ann._id, ownerId: '${ann.id}', editionId: e.family, santaMemberId: m.kid, createdAt: now },
  { _id: id(), wishId: w.bob._id, ownerId: '${bob.id}', editionId: e.family, santaMemberId: m.ann, createdAt: now },
]);
db.tips.insertMany([
  { _id: id(), editionId: e.family, aboutMemberId: m.ann, authorMemberId: m.bob, text: 'Tip about Ann ${run}', anonymous: false, createdAt: now, updatedAt: now },
  { _id: id(), editionId: e.family, aboutMemberId: m.bob, authorMemberId: m.ann, text: 'Tip by Ann ${run}', anonymous: false, createdAt: now, updatedAt: now },
  { _id: id(), editionId: e.family, aboutMemberId: m.bob, authorMemberId: m.cee, text: 'Tip by Cee ${run}', anonymous: false, createdAt: now, updatedAt: now },
]);
db.questions.insertOne({ _id: id(), editionId: e.family, gifteeMemberId: m.ann, askerMemberId: m.kid, text: 'Question to Ann ${run}', createdAt: now });
db.nudges.insertOne({ _id: id(), editionId: e.family, santaMemberId: m.ann, gifteeMemberId: m.bob, kind: 'emptyWishlist', sendAfter: now, createdAt: now });
db.sentNotifications.insertOne({ _id: 'drawn:' + e.family + ':' + m.ann, kind: 'drawn', editionId: e.family, userId: '${ann.id}', memberId: m.ann, sentAt: now });
db.invites.insertOne({ _id: id(), groupId: g.solo, memberId: m.inv, email: '${emailFor('inv')}', tokenHash: 'h-${run}', createdAt: now, expiresAt: new Date(+now + 864e5) });
print(JSON.stringify({ m, g, e }));
`)
    .split('\n')
    .at(-1)
);

await step('dashboard lists only my groups, with edition status and the giftee cue', async () => {
  const { data } = await trpc('account.groups', undefined, { cookie: ann.cookie });
  const bySlug = Object.fromEntries(data.map((group) => [group.name, group]));
  assert.deepEqual(Object.keys(bySlug).sort(), ['Family', 'Solo']);
  assert.equal(bySlug.Family.edition.status, 'drawn');
  assert.equal(bySlug.Family.edition.gifteeReady, true);
  assert.equal(bySlug.Family.edition.giftDay, '2026-12-24');
  assert.equal(bySlug.Family.role, 'organizer');
  assert.equal(bySlug.Solo.edition.gifteeReady, false);
  assert.ok(!JSON.stringify(data).includes(ids.m.bob), 'no draw data');
  assert.equal((await trpc('account.groups')).status, 401);
});

await step('export contains my data and nobody else’s', async () => {
  const { status, data } = await trpc('account.export', undefined, { cookie: ann.cookie });
  assert.equal(status, 200);
  const text = JSON.stringify(data);
  assert.equal(data.account.email, ann.email);
  assert.deepEqual(data.wishes.map((w) => w.title), [`Ann wish ${run}`]);
  assert.deepEqual(data.tipsWritten.map((t) => t.text), [`Tip by Ann ${run}`]);
  assert.equal(data.groups.length, 2);
  assert.equal(data.passkeys.length, 1);
  for (const foreign of [bob.email, cee.email, `Bob ${run}`, `Bob wish ${run}`, `Kid wish ${run}`, `Tip about Ann ${run}`, `Tip by Cee ${run}`, ids.m.bob, ids.m.kid, emailFor('inv'), 'publicKey', 'token']) {
    assert.ok(!text.includes(foreign), `export leaks ${foreign}`);
  }
});

await step('deletion needs the emailed code', async () => {
  assert.equal((await trpc('account.delete', { code: '000000' }, { cookie: ann.cookie, mutation: true })).error.data.appCode, 'INVALID_CODE');
  const before = (await mailsTo(ann.email)).length;
  assert.equal((await trpc('account.requestDeletion', undefined, { cookie: ann.cookie, mutation: true })).status, 200);
  const mail = (await mailsTo(ann.email)).at(-1);
  assert.equal((await mailsTo(ann.email)).length, before + 1);
  assert.equal(mail.subject, 'Bevestig het verwijderen van je Givto-account');
  const code = mail.text.match(/\b(\d{6})\b/)[1];
  const wrong = String((Number(code) + 1) % 1e6).padStart(6, '0');
  assert.equal((await trpc('account.delete', { code: wrong }, { cookie: ann.cookie, mutation: true })).error.data.appCode, 'INVALID_CODE');
  const done = await trpc('account.delete', { code }, { cookie: ann.cookie, mutation: true });
  assert.equal(done.status, 200, JSON.stringify(done.error));
  assert.equal((await trpc('me.get', undefined, { cookie: ann.cookie })).status, 401);
  assert.equal((await trpc('account.delete', { code }, { cookie: bob.cookie, mutation: true })).error.data.appCode, 'INVALID_CODE');
});

await step('deletion leaves no personal data in any collection', async () => {
  const needles = [ann.id, ann.email, `Annabel ${run}`, `Ann wish ${run}`, `Tip about Ann ${run}`, `Tip by Ann ${run}`, `Question to Ann ${run}`, 'Annstraat'];
  const hits = mongo(`
const needles = ${JSON.stringify(needles)};
const hits = [];
for (const name of db.getCollectionNames()) {
  for (const doc of db[name].find().toArray()) {
    const text = EJSON.stringify(doc);
    for (const needle of needles) if (text.includes(needle)) hits.push(name + ': ' + needle);
  }
}
print(JSON.stringify(hits));`);
  assert.deepEqual(JSON.parse(hits), []);
});

await step('after deletion the others’ draw stays valid and the organizer role moved on', async () => {
  const family = JSON.parse(mongo(`EJSON.stringify(db.groups.findOne({ _id: '${ids.g.family}' }))`));
  const annMember = family.members.find((m) => m.id === ids.m.ann);
  assert.equal(annMember.status, 'removed');
  assert.equal(annMember.name, 'Deleted account');
  assert.equal(annMember.userId, undefined);
  assert.equal(family.members.find((m) => m.id === ids.m.bob).role, 'organizer');
  assert.equal(family.members.find((m) => m.id === ids.m.kid).managedBy, ids.m.bob);
  assert.equal(family.createdBy, bob.id);
  assert.equal(family.organizerHandover.toMemberId, ids.m.bob);
  const edition = JSON.parse(mongo(`EJSON.stringify(db.editions.findOne({ _id: '${ids.e.family}' }))`));
  assert.deepEqual(edition.draw.assignments, { [ids.m.ann]: ids.m.bob, [ids.m.bob]: ids.m.cee, [ids.m.cee]: ids.m.kid, [ids.m.kid]: ids.m.ann });
  assert.equal(edition.participants.length, 4);
  assert.equal(mongo(`db.groups.countDocuments({ _id: '${ids.g.solo}' }) + db.editions.countDocuments({ groupId: '${ids.g.solo}' }) + db.invites.countDocuments({ groupId: '${ids.g.solo}' })`), '0');
  assert.equal(mongo(`db.wishes.countDocuments({ title: 'Kid wish ${run}' }) + db.tips.countDocuments({ text: 'Tip by Cee ${run}' })`), '2');
  const bobGroups = (await trpc('account.groups', undefined, { cookie: bob.cookie })).data;
  assert.deepEqual(bobGroups.map((g) => g.name).sort(), ['Family', 'Other']);
});

if (SERVER_LOG) {
  await step('server log (incl. request lines) has no sign-in tokens', async () => {
    const log = readFileSync(SERVER_LOG, 'utf8');
    // next dev prints request lines (next start doesn't): then the landing page must be among them.
    if (/ GET \//.test(log)) assert.match(log, /GET \/auth\/link/);
    for (const token of tokens) assert.ok(!log.includes(token), `token in log: ${token}`);
    assert.doesNotMatch(log, /s5-[a-z]+-\d+@example\.test/);
  });
} else {
  console.log('--  server log check skipped (set SERVER_LOG)');
}
