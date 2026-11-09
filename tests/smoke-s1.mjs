// S1 API smoke (create & join) against a running app (start one with tests/env.sh).
// Run: BASE_URL=… MAIL_URL=… MONGO_CONTAINER=… [SERVER_LOG=…] pnpm test:smoke:s1
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomInt } from 'node:crypto';
import { readFileSync } from 'node:fs';

const BASE = process.env.BASE_URL ?? 'http://localhost:3901';
const MAIL = process.env.MAIL_URL ?? 'http://localhost:3991';
const MONGO = process.env.MONGO_CONTAINER ?? 'givto-mongo-s1';
const DB = process.env.MONGODB_DB ?? 'givto_test';
const SERVER_LOG = process.env.SERVER_LOG;

const run = Date.now();
const emailFor = (name) => `s1-${name}-${run}@example.test`;
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

const auth = (path, body) =>
  fetch(`${BASE}/api/auth${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: BASE, 'x-forwarded-for': ip() },
    body: JSON.stringify(body),
  });

/** Untyped tRPC client (superjson wire format, no batching). */
const trpc = async (path, input, { cookie, mutation = false } = {}) => {
  const payload = JSON.stringify({ json: input ?? null });
  const res = await fetch(
    `${BASE}/api/trpc/${path}${mutation ? '' : `?input=${encodeURIComponent(payload)}`}`,
    {
      method: mutation ? 'POST' : 'GET',
      headers: { 'content-type': 'application/json', ...(cookie && { cookie }) },
      ...(mutation && { body: payload }),
    }
  );
  const body = await res.json();
  return { status: res.status, data: body.result?.data?.json, error: body.error?.json };
};
const query = (path, input, cookie) => trpc(path, input, { cookie });
const mutate = (path, input, cookie) => trpc(path, input, { cookie, mutation: true });

const appCode = (result) => result.error?.data?.appCode;
const mailsTo = async (email) => (await fetch(`${MAIL}/messages?to=${encodeURIComponent(email)}`)).json();
const mongo = (js) =>
  execFileSync('docker', ['exec', MONGO, 'mongosh', DB, '--quiet', '--eval', js]).toString().trim();

/** Verifies the email with the emailed code; returns the session cookie. */
const signIn = async (email) => {
  const before = (await mailsTo(email)).length;
  const res = await auth('/sign-in/magic-link', { email, callbackURL: '/new' });
  assert.equal(res.status, 200, await res.text());
  const mail = (await mailsTo(email))[before];
  const otp = mail.text.match(/\b(\d{6})\b/)[1];
  const verified = await auth('/sign-in/email-otp', { email, otp });
  assert.equal(verified.status, 200);
  return cookiesOf(verified);
};

const createInput = {
  name: 'Family',
  organizerName: 'Ann.Smith',
  timeZone: 'Europe/Brussels',
  giftDay: { date: '2099-12-24', time: '18:00', place: 'Grandma’s' },
  exchangeMode: 'inPerson',
  budget: { currency: 'EUR', amount: 2500 },
};

const ann = emailFor('ann');
let annCookie = '';
let slug = '';
let token = '';

await step('create without a session → UNAUTHENTICATED, no mail sent', async () => {
  const result = await mutate('group.create', createInput);
  assert.equal(result.status, 401);
  assert.equal(appCode(result), 'UNAUTHENTICATED');
  const invite = await mutate('invite.send', { groupSlug: 'abcdefgh', name: 'Vic', email: emailFor('victim') });
  assert.equal(appCode(invite), 'UNAUTHENTICATED');
  assert.equal((await mailsTo(emailFor('victim'))).length, 0);
});

await step('create after verifying the email (dotted name ok, URL name and past gift day rejected)', async () => {
  annCookie = await signIn(ann);
  assert.equal(appCode(await mutate('group.create', { ...createInput, name: 'win at evil.com' }, annCookie)), 'INVALID_INPUT');
  assert.equal(
    appCode(await mutate('group.create', { ...createInput, giftDay: { date: '2001-01-01' } }, annCookie)),
    'DATE_IN_PAST'
  );
  const created = await mutate('group.create', createInput, annCookie);
  assert.equal(created.status, 200, JSON.stringify(created.error));
  ({ slug, joinToken: token } = created.data);
  const { data } = await query('group.get', { groupSlug: slug }, annCookie);
  assert.equal(data.name, 'Family');
  assert.equal(data.me.isOrganizer, true);
  assert.equal(data.edition.status, 'open');
  assert.deepEqual(data.edition.budget, { currency: 'EUR', amount: 2500 });
  assert.equal(data.members[0].email, ann);
  assert.equal(data.organizer.joinLink.token, token);
  assert.equal((await query('me.get', undefined, annCookie)).data.name, 'Ann.Smith');
});

const bob = emailFor('bob');
let bobCookie = '';

await step('join via link: preview without member list, join after verifying, members see names only', async () => {
  const preview = await query('join.preview', { groupSlug: slug, token });
  assert.deepEqual(preview.data, { groupName: 'Family', organizerFirstName: 'Ann.Smith', requiresApproval: false });
  assert.equal((await query('join.preview', { groupSlug: slug, token: 'x'.repeat(24) })).data, null);
  assert.equal(appCode(await mutate('join.accept', { groupSlug: slug, token, name: 'Bob' })), 'UNAUTHENTICATED');
  bobCookie = await signIn(bob);
  assert.equal(appCode(await mutate('join.accept', { groupSlug: slug, token, name: 'bob.com' }, bobCookie)), 'INVALID_INPUT');
  const joined = await mutate('join.accept', { groupSlug: slug, token, name: 'Bob' }, bobCookie);
  assert.deepEqual(joined.data, { slug, status: 'joined' });
  const { data } = await query('group.get', { groupSlug: slug }, bobCookie);
  assert.equal(data.me.isOrganizer, false);
  assert.deepEqual(data.members.map((m) => m.name), ['Ann.Smith', 'Bob']);
  assert.ok(data.members.every((m) => m.email === undefined));
  assert.equal(data.organizer, null);
  assert.equal(data.edition.participantIds.length, 2);
});

await step('same email twice = one member', async () => {
  const again = await mutate('join.accept', { groupSlug: slug, token, name: 'Bobby' }, bobCookie);
  assert.equal(again.data.status, 'joined');
  const otherSession = await signIn(bob);
  await mutate('join.accept', { groupSlug: slug, token, name: 'Bob' }, otherSession);
  const { data } = await query('group.get', { groupSlug: slug }, annCookie);
  assert.equal(data.members.filter((m) => m.email === bob).length, 1);
  assert.equal(data.joinedCount, 2);
});

await step('non-organizer can’t manage; outsiders don’t see the group', async () => {
  for (const [path, input] of [
    ['join.revokeLink', {}],
    ['join.regenerateLink', {}],
    ['join.updateLink', { requiresApproval: true, maxMembers: null }],
    ['invite.send', { name: 'Zed', email: emailFor('zed') }],
    ['membership.approve', { memberId: '0'.repeat(24) }],
    ['group.setKeepApart', { households: [], pairs: [] }],
  ]) {
    assert.equal(appCode(await mutate(path, { groupSlug: slug, ...input }, bobCookie)), 'NOT_ORGANIZER', path);
  }
  assert.equal((await mailsTo(emailFor('zed'))).length, 0);
  const outsider = await signIn(emailFor('out'));
  assert.equal(appCode(await query('group.get', { groupSlug: slug }, outsider)), 'GROUP_NOT_FOUND');
  assert.equal(appCode(await query('group.get', { groupSlug: 'nope-nope' }, outsider)), 'GROUP_NOT_FOUND');
});

const cee = emailFor('cee');
let ceeCookie = '';
const memberId = async (email) =>
  (await query('group.get', { groupSlug: slug }, annCookie)).data.members.find((m) => m.email === email);

await step('approval flow: requested until approved; rejected stays out', async () => {
  await mutate('join.updateLink', { groupSlug: slug, requiresApproval: true, maxMembers: null }, annCookie);
  assert.equal((await query('join.preview', { groupSlug: slug, token })).data.requiresApproval, true);
  ceeCookie = await signIn(cee);
  assert.equal((await mutate('join.accept', { groupSlug: slug, token, name: 'Cee' }, ceeCookie)).data.status, 'requested');
  assert.equal(appCode(await query('group.get', { groupSlug: slug }, ceeCookie)), 'GROUP_NOT_FOUND');
  const requested = await memberId(cee);
  assert.equal(requested.status, 'requested');
  assert.equal((await mutate('membership.approve', { groupSlug: slug, memberId: requested.id }, annCookie)).status, 200);
  const { data } = await query('group.get', { groupSlug: slug }, ceeCookie);
  assert.ok(data.edition.participantIds.includes(requested.id));

  const dee = emailFor('dee');
  const deeCookie = await signIn(dee);
  await mutate('join.accept', { groupSlug: slug, token, name: 'Dee' }, deeCookie);
  await mutate('membership.reject', { groupSlug: slug, memberId: (await memberId(dee)).id }, annCookie);
  assert.equal(appCode(await query('group.get', { groupSlug: slug }, deeCookie)), 'GROUP_NOT_FOUND');
  assert.equal(await memberId(dee), undefined);
});

await step('member cap: full link refuses new people', async () => {
  await mutate('join.updateLink', { groupSlug: slug, requiresApproval: false, maxMembers: 3 }, annCookie);
  const eveCookie = await signIn(emailFor('eve'));
  assert.equal(appCode(await mutate('join.accept', { groupSlug: slug, token, name: 'Eve' }, eveCookie)), 'GROUP_FULL');
  await mutate('join.updateLink', { groupSlug: slug, requiresApproval: false, maxMembers: null }, annCookie);
  assert.equal((await mutate('join.accept', { groupSlug: slug, token, name: 'Eve' }, eveCookie)).data.status, 'joined');
});

await step('revoked link rejected; regenerated link works, old one doesn’t', async () => {
  await mutate('join.revokeLink', { groupSlug: slug }, annCookie);
  assert.equal((await query('join.preview', { groupSlug: slug, token })).data, null);
  const late = await signIn(emailFor('late'));
  assert.equal(appCode(await mutate('join.accept', { groupSlug: slug, token, name: 'Late' }, late)), 'JOIN_LINK_INVALID');
  const regenerated = await mutate('join.regenerateLink', { groupSlug: slug }, annCookie);
  const fresh = regenerated.data.token;
  assert.notEqual(fresh, token);
  assert.equal((await mutate('join.accept', { groupSlug: slug, token, name: 'Late' }, late)).error.data.appCode, 'JOIN_LINK_INVALID');
  assert.equal((await mutate('join.accept', { groupSlug: slug, token: fresh, name: 'Late' }, late)).data.status, 'joined');
  token = fresh;
});

const inviteTokenFrom = async (email) => {
  const [mail] = (await mailsTo(email)).slice(-1);
  return mail.text.match(/[?&]invite=([A-Za-z0-9_-]+)/)[1];
};

await step('email invite: bound to the email, single-use, lands on the group', async () => {
  const fay = emailFor('fay');
  const sent = await mutate('invite.send', { groupSlug: slug, name: 'Fay', email: fay }, annCookie);
  assert.equal(sent.status, 200, JSON.stringify(sent.error));
  const [mail] = await mailsTo(fay);
  assert.equal(mail.subject, 'Ann.Smith invited you to Family on Givto');
  const inviteToken = await inviteTokenFrom(fay);
  const preview = await query('invite.preview', { groupSlug: slug, token: inviteToken });
  assert.equal(preview.data.invite.email, fay);
  assert.equal(appCode(await mutate('invite.accept', { groupSlug: slug, token: inviteToken }, bobCookie)), 'INVITE_EMAIL_MISMATCH');
  const fayCookie = await signIn(fay);
  assert.deepEqual((await mutate('invite.accept', { groupSlug: slug, token: inviteToken }, fayCookie)).data, { slug });
  assert.equal(appCode(await mutate('invite.accept', { groupSlug: slug, token: inviteToken }, fayCookie)), 'INVITE_INVALID');
  assert.equal((await query('invite.preview', { groupSlug: slug, token: inviteToken })).data, null);
  assert.equal((await query('group.get', { groupSlug: slug }, fayCookie)).status, 200);
  assert.equal((await memberId(fay)).status, 'joined');
  assert.equal(appCode(await mutate('invite.send', { groupSlug: slug, name: 'Fay', email: fay }, annCookie)), 'ALREADY_MEMBER');
});

await step('decline an email invite without an account', async () => {
  const gus = emailFor('gus');
  await mutate('invite.send', { groupSlug: slug, name: 'Gus', email: gus }, annCookie);
  const inviteToken = await inviteTokenFrom(gus);
  assert.equal((await mutate('invite.decline', { groupSlug: slug, token: inviteToken })).status, 200);
  assert.equal((await memberId(gus)).status, 'declined');
  assert.equal(appCode(await mutate('invite.decline', { groupSlug: slug, token: inviteToken })), 'INVITE_INVALID');
});

await step('invited email joining via the link = the same person', async () => {
  const hal = emailFor('hal');
  await mutate('invite.send', { groupSlug: slug, name: 'Hal', email: hal }, annCookie);
  const halCookie = await signIn(hal);
  assert.equal((await mutate('join.accept', { groupSlug: slug, token, name: 'Hal' }, halCookie)).data.status, 'joined');
  const { data } = await query('group.get', { groupSlug: slug }, annCookie);
  assert.equal(data.members.filter((m) => m.name === 'Hal').length, 1);
  assert.equal(data.members.find((m) => m.name === 'Hal').status, 'joined');
});

await step('keep apart: households saved; impossible sets refused', async () => {
  const { data } = await query('group.get', { groupSlug: slug }, annCookie);
  const joinedIds = data.members.filter((m) => m.status === 'joined').map((m) => m.id);
  const [annId, bobId] = joinedIds;
  const saved = await mutate('group.setKeepApart', { groupSlug: slug, households: [[annId, bobId]], pairs: [] }, annCookie);
  assert.equal(saved.status, 200, JSON.stringify(saved.error));
  const everyone = await mutate('group.setKeepApart', { groupSlug: slug, households: [joinedIds], pairs: [] }, annCookie);
  assert.equal(appCode(everyone), 'DRAW_IMPOSSIBLE');
  assert.equal((await query('group.get', { groupSlug: slug }, annCookie)).data.organizer.households.length, 1);
});

await step('leave before the draw; organizer can’t leave; leaving after the draw refused', async () => {
  assert.equal(appCode(await mutate('membership.leave', { groupSlug: slug }, annCookie)), 'ORGANIZER_CANNOT_LEAVE');
  const bobId = (await memberId(bob)).id;
  assert.equal((await mutate('membership.leave', { groupSlug: slug }, bobCookie)).status, 200);
  assert.equal(appCode(await query('group.get', { groupSlug: slug }, bobCookie)), 'GROUP_NOT_FOUND');
  const { data } = await query('group.get', { groupSlug: slug }, annCookie);
  assert.ok(!data.edition.participantIds.includes(bobId));
  assert.equal(data.organizer.households.length, 0, 'a one-person household is dropped');
  mongo(`db.groups.findOne({ slug: '${slug}' })._id && db.editions.updateOne({ groupId: db.groups.findOne({ slug: '${slug}' })._id }, { $set: { status: 'drawn' } })`);
  assert.equal(appCode(await mutate('membership.leave', { groupSlug: slug }, ceeCookie)), 'ALREADY_DRAWN');
});

await step('invites rate limited per organizer', async () => {
  const sendOne = (i) => mutate('invite.send', { groupSlug: slug, name: `Guest ${i}`, email: emailFor(`guest${i}`) }, annCookie);
  const codes = [];
  for (let i = 0; i < 30; i++) codes.push(appCode(await sendOne(i)) ?? 'ok');
  assert.ok(codes.includes('RATE_LIMITED'), codes.join(','));
  assert.equal((await mailsTo(emailFor('guest29'))).length, 0);
});

if (SERVER_LOG) {
  await step('server log has no emails', async () => {
    const log = readFileSync(SERVER_LOG, 'utf8');
    assert.match(log, /group\.create/);
    assert.doesNotMatch(log, /@example\.test/);
  });
}
