// Core API: health, error shape, sign-in by code and link, sign-out,
// rate limits, closed Better Auth endpoints, no secrets in the server log.
import { createHash } from 'node:crypto';
import {
  authPost,
  expect,
  latestMail,
  mailsTo,
  ok,
  randomIp,
  readServerLog,
  requestSignIn,
  setCookies,
  signInWithCode,
  test,
  uniqueEmail,
} from '../fixtures';

const dutch = { 'accept-language': 'nl-NL,nl;q=0.9,en;q=0.8' };

// Every core test: no address of any test so far is in the log.
test.afterEach(() => {
  expect(readServerLog()).not.toMatch(/@example\.test/);
});

test('health', async ({ newClient }) => {
  const { trpc } = await newClient();
  const { status, data } = await trpc.query('health');
  expect(status).toBe(200);
  expect(data).toEqual({ ok: true });
});

test('me without a session → UNAUTHENTICATED with request id', async ({ newClient }) => {
  const { trpc } = await newClient();
  const { status, error } = await trpc.query('me.get');
  expect(status).toBe(401);
  expect(error?.data.appCode).toBe('UNAUTHENTICATED');
  expect(error?.data.requestId).toMatch(/^[0-9a-f-]{36}$/);
  expect(error?.data).not.toHaveProperty('stack');
});

test('sign in with the emailed code; me.get, me.setLocale, reused code, sign-out', async ({ newClient, secrets }) => {
  const ann = await newClient();
  const email = uniqueEmail('ann');
  const { code } = await test.step('new account takes the browser language', async () => {
    const signIn = await requestSignIn(ann.request, email, { headers: dutch });
    secrets.push(email, signIn.code, signIn.token);
    expect(signIn.mail.subject).toBe('Inloggen bij Givto');
    expect(signIn.mail.from).toBe('Givto <no-reply@mail.givto.app>');
    const res = await signInWithCode(ann.request, email, signIn.code, { headers: dutch });
    expect(res.status()).toBe(200);
    expect(setCookies(res)).toMatch(/session_token=/);
    return signIn;
  });

  await test.step('me.get', async () => {
    const me = ok(await ann.trpc.query('me.get'));
    expect(me.email).toBe(email);
    expect(me.locale).toBe('nl');
    expect(me.notifications).toEqual({ reminders: true, wishlistUpdates: true, santaMessages: true, nextYear: true, joins: true });
    expect(readServerLog(), 'procedure lines are logged').toMatch(/me\.get/);
  });

  await test.step('me.setLocale (and invalid input → INVALID_INPUT with issues)', async () => {
    expect((await ann.trpc.mutate('me.setLocale', { locale: 'en' })).status).toBe(200);
    expect(ok(await ann.trpc.query('me.get')).locale).toBe('en');
    const bad = await ann.trpc.mutate('me.setLocale', { locale: 'fr' } as never);
    expect(bad.status).toBe(400);
    expect(bad.error?.data.appCode).toBe('INVALID_INPUT');
    expect(bad.error?.data.issues?.[0].path).toBe('locale');
  });

  await test.step('reused code rejected', async () => {
    const res = await signInWithCode((await newClient()).request, email, code);
    expect(res.status()).toBe(400);
    expect(setCookies(res)).toBe('');
  });

  await test.step('sign-out ends the session', async () => {
    const session = await ann.request.storageState();
    expect((await authPost(ann.request, '/sign-out', {})).status()).toBe(200);
    // The old cookie, sent again: the session is gone on the server, not just in this jar.
    const stale = await newClient({ storageState: session });
    expect((await stale.trpc.query('me.get')).status).toBe(401);
  });
});

test('sign in with the magic link token (POST); reused token rejected', async ({ newClient, secrets }) => {
  const bob = await newClient();
  const email = uniqueEmail('bob');
  const { code, token } = await requestSignIn(bob.request, email);
  secrets.push(email, code, token);
  expect((await authPost(bob.request, '/magic-link/verify-token', { token })).status()).toBe(200);
  expect(ok(await bob.trpc.query('me.get')).email).toBe(email);
  const again = await authPost((await newClient()).request, '/magic-link/verify-token', { token });
  expect(again.status()).toBe(400);
  expect((await again.json()).code).toBe('INVALID_TOKEN');
  expect(setCookies(again)).toBe('');
});

test('emails ask Mailgun not to track opens or clicks (sign-in links stay direct)', async ({ request, secrets }) => {
  const email = uniqueEmail('trk');
  const { code, token } = await requestSignIn(request, email);
  secrets.push(email, code, token);
  expect((await latestMail(email)).tracking).toBe('no');
});

test('wrong code rejected, expired code rejected', async ({ newClient, db, secrets }) => {
  const { request } = await newClient();
  const email = uniqueEmail('cee');
  const signIn = async () => {
    const { code, token } = await requestSignIn(request, email);
    secrets.push(code, token);
    return code;
  };
  secrets.push(email);
  const code = await signIn();
  const wrong = String((Number(code) + 1) % 1_000_000).padStart(6, '0');
  expect((await signInWithCode(request, email, wrong)).status()).toBe(400);
  // Identifiers are stored hashed (Better Auth: base64url SHA-256), so expire only this address's code.
  const identifier = createHash('sha256').update(`sign-in-otp-${email}`).digest('base64url');
  const expire = () =>
    db.raw.collection('verifications').updateOne({ identifier }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
  expect((await expire()).matchedCount).toBe(1);
  let res = await signInWithCode(request, email, code);
  expect(res.status()).toBe(400);
  // Every Better Auth verification lookup deletes all expired rows, so a parallel test's sign-in can
  // remove ours first (INVALID_OTP). Then try again with a new code (5 sign-in emails per address).
  for (let retry = 0; retry < 3 && (await res.json()).code === 'INVALID_OTP'; retry++) {
    const fresh = await signIn();
    expect((await expire()).matchedCount).toBe(1);
    res = await signInWithCode(request, email, fresh);
  }
  expect(res.status()).toBe(400);
  expect((await res.json()).code).toBe('OTP_EXPIRED');
});

test('sign-in emails rate limited per address', async ({ request, secrets }) => {
  const email = uniqueEmail('dan');
  secrets.push(email);
  for (let i = 0; i < 5; i++) expect((await authPost(request, '/sign-in/magic-link', { email })).status()).toBe(200);
  expect((await authPost(request, '/sign-in/magic-link', { email })).status()).toBe(429);
  expect(await mailsTo(email)).toHaveLength(5);
});

test('sign-in emails rate limited per IP', async ({ request, secrets }) => {
  const ip = randomIp();
  const statuses = [];
  for (let i = 0; i < 6; i++) {
    const email = uniqueEmail(`ip${i}`);
    secrets.push(email);
    statuses.push((await authPost(request, '/sign-in/magic-link', { email }, { ip })).status());
  }
  expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
});

test('callbackURL on another origin rejected', async ({ request, secrets }) => {
  const eve = uniqueEmail('eve');
  secrets.push(eve);
  const res = await authPost(request, '/sign-in/magic-link', { email: eve, callbackURL: 'https://evil.test/' });
  expect(res.status()).toBe(403);
  expect(await mailsTo(eve)).toHaveLength(0);
  // The link's callbackURL is only applied client-side (safeRedirect); the GET verify endpoint is closed.
  const fay = uniqueEmail('fay');
  const { code, token } = await requestSignIn(request, fay);
  secrets.push(fay, code, token);
  const verify = await request.get(`/api/auth/magic-link/verify?token=${token}&callbackURL=/`, {
    maxRedirects: 0,
    headers: { 'x-forwarded-for': randomIp() },
  });
  expect(verify.status()).toBe(404);
  expect(setCookies(verify)).toBe('');
});

test('password, profile and code-only endpoints closed', async ({ request, secrets }) => {
  for (const path of ['/sign-up/email', '/sign-in/email', '/update-user', '/email-otp/send-verification-otp']) {
    const email = uniqueEmail('x');
    secrets.push(email);
    const res = await authPost(request, path, { email, password: 'password123', name: 'X', type: 'sign-in' });
    expect(res.status(), path).toBe(404);
  }
});
