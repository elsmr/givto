// API smoke test against a running app (start one with tests/env.sh).
// Run: BASE_URL=… MAIL_URL=… SERVER_LOG=… MONGO_CONTAINER=… pnpm test:smoke
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomInt } from 'node:crypto';
import { readFileSync } from 'node:fs';

const BASE = process.env.BASE_URL ?? 'http://localhost:3601';
const MAIL = process.env.MAIL_URL ?? 'http://localhost:3691';
const SERVER_LOG = process.env.SERVER_LOG;
const MONGO = process.env.MONGO_CONTAINER ?? 'givto-mongo-f1';
const DB = process.env.MONGODB_DB ?? 'givto_test';

const run = Date.now();
const emailFor = (name) => `smoke-${name}-${run}@example.test`;
const secrets = []; // every email, code and token we see; none may appear in the server log
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

/** Better Auth endpoint, as a browser on our origin would call it. */
const auth = (path, body, { cookie, from = ip(), headers = {} } = {}) =>
  fetch(`${BASE}/api/auth${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: BASE,
      'x-forwarded-for': from,
      ...(cookie && { cookie }),
      ...headers,
    },
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

const mailsTo = async (email) => (await fetch(`${MAIL}/messages?to=${encodeURIComponent(email)}`)).json();

/** Requests a sign-in email and returns the code and link from it. */
const requestSignIn = async (email, { callbackURL = '/auth/passkeys', headers } = {}) => {
  secrets.push(email);
  const before = (await mailsTo(email)).length;
  const res = await auth('/sign-in/magic-link', { email, callbackURL }, { headers });
  assert.equal(res.status, 200, await res.text());
  const mails = await mailsTo(email);
  assert.equal(mails.length, before + 1);
  const mail = mails.at(-1);
  const otp = mail.text.match(/\b(\d{6})\b/)?.[1];
  const link = mail.html.match(/href="([^"]*\/magic-link\/verify[^"]*)"/)?.[1]?.replaceAll('&amp;', '&');
  assert.ok(otp && link, 'code and link in one email');
  secrets.push(otp, new URL(link).searchParams.get('token'));
  return { otp, link, mail };
};

const signInWithCode = async (email, otp, headers) => {
  const res = await auth('/sign-in/email-otp', { email, otp }, { headers });
  return { res, cookie: cookiesOf(res) };
};

const mongo = (js) =>
  execFileSync('docker', ['exec', MONGO, 'mongosh', DB, '--quiet', '--eval', js]).toString().trim();

await step('health', async () => {
  const { status, data } = await trpc('health');
  assert.equal(status, 200);
  assert.deepEqual(data, { ok: true });
});

await step('me without a session → UNAUTHENTICATED with request id', async () => {
  const { status, error } = await trpc('me.get');
  assert.equal(status, 401);
  assert.equal(error.data.appCode, 'UNAUTHENTICATED');
  assert.match(error.data.requestId, /^[0-9a-f-]{36}$/);
  assert.equal(error.data.stack, undefined);
});

let cookie = '';
const ann = emailFor('ann');
const dutch = { 'accept-language': 'nl-NL,nl;q=0.9,en;q=0.8' };
let annOtp = '';

await step('sign in with the emailed code (new account takes the browser language)', async () => {
  const { otp, mail } = await requestSignIn(ann, { headers: dutch });
  assert.equal(mail.subject, 'Inloggen bij Givto');
  assert.equal(mail.from, 'Givto <no-reply@mail.givto.app>');
  annOtp = otp;
  const result = await signInWithCode(ann, otp, dutch);
  assert.equal(result.res.status, 200);
  cookie = result.cookie;
  assert.match(cookie, /session_token=/);
});

await step('me.get', async () => {
  const { status, data } = await trpc('me.get', undefined, { cookie });
  assert.equal(status, 200);
  assert.equal(data.email, ann);
  assert.equal(data.locale, 'nl');
  assert.deepEqual(data.notifications, { reminders: true, wishlistUpdates: true, santaMessages: true, nextYear: true });
});

await step('me.setLocale (and invalid input → INVALID_INPUT with issues)', async () => {
  const ok = await trpc('me.setLocale', { locale: 'en' }, { cookie, mutation: true });
  assert.equal(ok.status, 200);
  assert.equal((await trpc('me.get', undefined, { cookie })).data.locale, 'en');
  const bad = await trpc('me.setLocale', { locale: 'fr' }, { cookie, mutation: true });
  assert.equal(bad.status, 400);
  assert.equal(bad.error.data.appCode, 'INVALID_INPUT');
  assert.equal(bad.error.data.issues[0].path, 'locale');
});

await step('reused code rejected', async () => {
  const { res, cookie: none } = await signInWithCode(ann, annOtp);
  assert.equal(res.status, 400);
  assert.equal(none, '');
});

await step('sign-out ends the session', async () => {
  const res = await auth('/sign-out', {}, { cookie });
  assert.equal(res.status, 200);
  assert.equal((await trpc('me.get', undefined, { cookie })).status, 401);
});

await step('sign in with the magic link; reused link rejected', async () => {
  const bob = emailFor('bob');
  const { link } = await requestSignIn(bob);
  const first = await fetch(link, { redirect: 'manual', headers: { 'x-forwarded-for': ip() } });
  assert.equal(first.status, 302);
  assert.equal(first.headers.get('location'), `${BASE}/auth/passkeys`);
  const bobCookie = cookiesOf(first);
  assert.equal((await trpc('me.get', undefined, { cookie: bobCookie })).data.email, bob);
  const again = await fetch(link, { redirect: 'manual', headers: { 'x-forwarded-for': ip() } });
  assert.equal(again.status, 302);
  assert.match(again.headers.get('location'), /error=INVALID_TOKEN/);
  assert.equal(cookiesOf(again), '');
});

await step('wrong code rejected, expired code rejected', async () => {
  const cee = emailFor('cee');
  const { otp } = await requestSignIn(cee);
  const wrong = String((Number(otp) + 1) % 1_000_000).padStart(6, '0');
  assert.equal((await signInWithCode(cee, wrong)).res.status, 400);
  // Identifiers are hashed, so expire every pending code (this test runs alone).
  mongo('db.verifications.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } })');
  const expired = await signInWithCode(cee, otp);
  assert.equal(expired.res.status, 400);
  assert.equal((await expired.res.json()).code, 'OTP_EXPIRED');
});

await step('sign-in emails rate limited per address', async () => {
  const dan = emailFor('dan');
  secrets.push(dan);
  for (let i = 0; i < 5; i++) assert.equal((await auth('/sign-in/magic-link', { email: dan })).status, 200);
  const limited = await auth('/sign-in/magic-link', { email: dan });
  assert.equal(limited.status, 429);
  assert.equal((await mailsTo(dan)).length, 5);
});

await step('sign-in emails rate limited per IP', async () => {
  const from = ip();
  const statuses = [];
  for (let i = 0; i < 6; i++) {
    const email = emailFor(`ip${i}`);
    secrets.push(email);
    statuses.push((await auth('/sign-in/magic-link', { email }, { from })).status);
  }
  assert.deepEqual(statuses, [200, 200, 200, 200, 200, 429]);
});

await step('callbackURL on another origin rejected', async () => {
  const eve = emailFor('eve');
  secrets.push(eve);
  const res = await auth('/sign-in/magic-link', { email: eve, callbackURL: 'https://evil.test/' });
  assert.equal(res.status, 403);
  assert.equal((await mailsTo(eve)).length, 0);
  const { link } = await requestSignIn(emailFor('fay'));
  const tampered = new URL(link);
  tampered.searchParams.set('callbackURL', 'https://evil.test/');
  const verify = await fetch(tampered, { redirect: 'manual', headers: { 'x-forwarded-for': ip() } });
  assert.equal(verify.status, 403);
  assert.equal(cookiesOf(verify), '');
});

await step('password, profile and code-only endpoints closed', async () => {
  for (const path of ['/sign-up/email', '/sign-in/email', '/update-user', '/email-otp/send-verification-otp']) {
    const res = await auth(path, { email: emailFor('x'), password: 'password123', name: 'X', type: 'sign-in' });
    assert.equal(res.status, 404, path);
  }
});

if (SERVER_LOG) {
  await step('server log has no emails, codes or tokens', async () => {
    // Skip Next dev's access lines (" GET /api/auth/magic-link/verify?token=…"): dev-only
    // output, not our logger.
    const log = readFileSync(SERVER_LOG, 'utf8')
      .split('\n')
      .filter((line) => !/^ (GET|POST|PUT|PATCH|DELETE) \//.test(line))
      .join('\n');
    assert.match(log, /me\.get/, 'procedure lines are logged');
    for (const secret of secrets.filter(Boolean)) {
      const leaked = /^\d{6}$/.test(secret) ? new RegExp(`\\b${secret}\\b`).test(log) : log.includes(secret);
      assert.ok(!leaked, `leaked: ${secret}`);
    }
    assert.doesNotMatch(log, /@example\.test/);
  });
} else {
  console.log('--  server log check skipped (set SERVER_LOG)');
}
