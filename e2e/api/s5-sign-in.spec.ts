// Sign-in details and locale (was tests/smoke-s5.mjs, part 1). Part 2 (passkeys, preferences,
// dashboard, export, deletion): s5-account.spec.ts.
import type { APIRequestContext } from '@playwright/test';
import { daysUntil } from '@/components/dashboard/days-until';
import {
  authPost,
  expect,
  ok,
  readServerLog,
  requestSignIn,
  setCookies,
  signInWithCode,
  test,
  uniqueEmail,
  type AuthOptions,
} from '../fixtures';

/** A sign-in mail whose link carries the token and callbackURL in the fragment only, never the query. */
const requestSignInLink = async (request: APIRequestContext, email: string, secrets: string[], options?: AuthOptions) => {
  const signIn = await requestSignIn(request, email, { callbackURL: '/groups', ...options });
  secrets.push(email, signIn.code, signIn.token);
  const url = new URL(signIn.link);
  expect(url.pathname).toBe('/auth/link');
  expect(url.search, 'no token in the query string').toBe('');
  expect(new URLSearchParams(url.hash.slice(1)).get('callbackURL')).toBe('/groups');
  return signIn;
};

const withToken = (request: APIRequestContext, token: string) => authPost(request, '/magic-link/verify-token', { token });

test('gift day countdown uses the edition time zone', () => {
  const lateEvening = new Date('2026-12-23T23:30:00Z'); // 24 Dec 00:30 in Brussels
  expect(daysUntil('2026-12-24', 'Europe/Brussels', lateEvening)).toBe(0);
  expect(daysUntil('2026-12-24', 'America/New_York', lateEvening)).toBe(1);
  expect(daysUntil('2026-12-24', 'UTC', new Date('2026-11-24T10:00:00Z'))).toBe(30);
  expect(daysUntil('2026-12-24', 'UTC', new Date('2026-12-26T10:00:00Z'))).toBe(-2);
});

test('code sign-in invalidates the link from the same email', async ({ request, secrets }) => {
  const email = uniqueEmail('code');
  const { code, token } = await requestSignInLink(request, email, secrets);
  expect((await signInWithCode(request, email, code)).status()).toBe(200);
  const link = await withToken(request, token);
  expect(link.status()).toBe(400);
  expect((await link.json()).code).toBe('INVALID_TOKEN');
});

test('link sign-in (POST, token in body) invalidates the code', async ({ newClient, secrets }) => {
  const { request, trpc } = await newClient();
  const email = uniqueEmail('link');
  const { code, token } = await requestSignInLink(request, email, secrets);
  expect((await withToken(request, token)).status()).toBe(200);
  expect(ok(await trpc.query('me.get')).email).toBe(email);
  expect((await signInWithCode(request, email, code)).status()).toBe(400);
});

test('a resent email replaces the code; the newest code works', async ({ request, secrets }) => {
  const email = uniqueEmail('resend');
  const first = await requestSignInLink(request, email, secrets);
  const second = await requestSignInLink(request, email, secrets);
  if (first.code !== second.code) expect((await signInWithCode(request, email, first.code)).status()).toBe(400);
  expect((await signInWithCode(request, email, second.code)).status()).toBe(200);
});

test('GET /magic-link/verify is closed', async ({ request }) => {
  const res = await request.get(`/api/auth/magic-link/verify?token=${'x'.repeat(32)}`, { maxRedirects: 0 });
  expect(res.status()).toBe(404);
  expect(setCookies(res)).toBe('');
});

test('link landing page loads without the token reaching the server', async ({ request }) => {
  expect((await request.get('/auth/link')).status()).toBe(200);
  // next dev prints request lines (next start doesn't): then the landing page must be among them.
  // That no token is logged is the `secrets` check every test gets.
  const log = readServerLog();
  if (/ GET \//.test(log)) expect(log).toMatch(/GET \/auth\/link/);
});

test('locale: new account takes the browser language; NEXT_LOCALE cookie beats Accept-Language', async ({ signIn }) => {
  const ann = await signIn('ann', { headers: { 'accept-language': 'nl-NL,nl;q=0.9' } });
  expect(ok(await ann.trpc.query('me.get')).locale).toBe('nl');
  const dee = await signIn('dee', { headers: { cookie: 'NEXT_LOCALE=nl', 'accept-language': 'en' } });
  expect(ok(await dee.trpc.query('me.get')).locale).toBe('nl');
});

test('locale: the account setting wins for sign-in emails', async ({ signIn, secrets }) => {
  const ann = await signIn('ann', { headers: { 'accept-language': 'nl-NL,nl;q=0.9' } });
  expect((await ann.trpc.mutate('me.setLocale', { locale: 'en' })).status).toBe(200);
  const { mail } = await requestSignInLink(ann.request, ann.email, secrets, { headers: { 'accept-language': 'nl' } });
  expect(mail.subject).toBe('Sign in to Givto');
});
