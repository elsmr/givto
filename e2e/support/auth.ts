// Better Auth over HTTP, as a browser on our origin would call it.
import { expect, type APIRequestContext, type APIResponse } from '@playwright/test';
import { randomBytes, randomInt } from 'node:crypto';
import { BASE_URL } from '../env';
import { latestMail, mailsTo, readSignInMail, type SignInMail } from './mail';

/** Rate limits are per IP (x-forwarded-for): a fresh one per call keeps tests independent. */
export const randomIp = () => `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`;

/** Unique per call, so parallel tests never share an account. */
export const uniqueEmail = (name: string) => `e2e-${name}-${randomBytes(4).toString('hex')}@example.test`;

export interface AuthOptions {
  /** x-forwarded-for; random by default. */
  ip?: string;
  headers?: Record<string, string>;
}

/** POST /api/auth<path>. Cookies it sets land in `request`'s cookie jar. */
export const authPost = (request: APIRequestContext, path: string, body: object, { ip = randomIp(), headers }: AuthOptions = {}) =>
  request.post(`/api/auth${path}`, {
    headers: { origin: BASE_URL, 'x-forwarded-for': ip, ...headers },
    data: body,
  });

/** `name=value; …` of the cookies a response sets (cleared ones left out); '' when none. */
export const setCookies = (res: APIResponse) =>
  res
    .headersArray()
    .filter(({ name }) => name.toLowerCase() === 'set-cookie')
    .map(({ value }) => value.split(';')[0])
    .filter((cookie) => !cookie.endsWith('='))
    .join('; ');

/** Requests a sign-in email and reads its code and link (exactly one new mail). */
export const requestSignIn = async (
  request: APIRequestContext,
  email: string,
  { callbackURL = '/account', ...options }: AuthOptions & { callbackURL?: string } = {}
): Promise<SignInMail> => {
  const before = (await mailsTo(email)).length;
  const res = await authPost(request, '/sign-in/magic-link', { email, callbackURL }, options);
  expect(res.status(), await res.text()).toBe(200);
  expect(await mailsTo(email)).toHaveLength(before + 1);
  return readSignInMail(await latestMail(email));
};

export const signInWithCode = (request: APIRequestContext, email: string, otp: string, options?: AuthOptions) =>
  authPost(request, '/sign-in/email-otp', { email, otp }, options);
