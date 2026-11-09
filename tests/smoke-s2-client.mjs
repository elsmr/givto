// Shared helpers for tests/smoke-s2.mjs: untyped tRPC client, sign-in via the mail mock, Mongo shell.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomInt } from 'node:crypto';
import superjson from 'superjson';

const BASE = process.env.BASE_URL ?? 'http://localhost:4001';
const MAIL = process.env.MAIL_URL ?? 'http://localhost:4091';
const MONGO = process.env.MONGO_CONTAINER ?? 'givto-mongo-s2';
const DB = process.env.MONGODB_DB ?? 'givto_test';

const run = Date.now();
export const emailsSeen = [];
const ip = () => `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`;

export const step = async (name, fn) => {
  await fn();
  console.log(`ok  ${name}`);
};

/** Untyped tRPC client (superjson, so `undefined` and Dates survive; no batching). */
export const trpc = async (path, input, { cookie, mutation = false } = {}) => {
  const payload = JSON.stringify(superjson.serialize(input ?? null));
  const res = await fetch(`${BASE}/api/trpc/${path}${mutation ? '' : `?input=${encodeURIComponent(payload)}`}`, {
    method: mutation ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json', ...(cookie && { cookie }) },
    ...(mutation && { body: payload }),
  });
  const body = await res.json();
  return { status: res.status, data: body.result && superjson.deserialize(body.result.data), error: body.error?.json };
};

export const as = (user) => ({
  query: (path, input) => trpc(path, input, { cookie: user.cookie }),
  mutate: (path, input) => trpc(path, input, { cookie: user.cookie, mutation: true }),
});

const auth = (path, body) =>
  fetch(`${BASE}/api/auth${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: BASE, 'x-forwarded-for': ip() },
    body: JSON.stringify(body),
  });

/** Signs a new person in with the emailed code: `{ id, email, cookie }`. */
export const signIn = async (name) => {
  const email = `s2-${name}-${run}@example.test`;
  emailsSeen.push(email);
  assert.equal((await auth('/sign-in/magic-link', { email, callbackURL: '/wishlist' })).status, 200);
  const mails = await (await fetch(`${MAIL}/messages?to=${encodeURIComponent(email)}`)).json();
  const otp = mails.at(-1).text.match(/\b(\d{6})\b/)[1];
  const res = await auth('/sign-in/email-otp', { email, otp });
  assert.equal(res.status, 200);
  const cookie = res.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .filter((c) => !c.endsWith('='))
    .join('; ');
  const me = await trpc('me.get', undefined, { cookie });
  return { id: me.data.id, email, cookie };
};

export const mongo = (js) =>
  execFileSync('docker', ['exec', MONGO, 'mongosh', DB, '--quiet', '--eval', js]).toString().trim();
