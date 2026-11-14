// Sign-in with Google (102). The round trip through Google itself is checked by hand.
import { BASE_URL } from '../env';
import { authPost, expect, setCookies, test } from '../fixtures';

const google = (request: Parameters<typeof authPost>[0], callbackURL = '/app') =>
  authPost(request, '/sign-in/social', { provider: 'google', callbackURL, errorCallbackURL: '/auth/sign-in' });

test('sign-in with Google redirects to Google with our callback', async ({ request }) => {
  const res = await google(request);
  expect(res.status()).toBe(200);
  const url = new URL((await res.json()).url);
  expect(url.origin).toBe('https://accounts.google.com');
  expect(url.searchParams.get('redirect_uri')).toBe(`${BASE_URL}/api/auth/callback/google`);
  expect(url.searchParams.get('scope')?.split(' ')).toEqual(expect.arrayContaining(['openid', 'email', 'profile']));
});

test('sign-in with Google refuses a callback to another site', async ({ request }) => {
  expect((await google(request, 'https://evil.test/')).status()).toBe(403);
});

test('a Google callback with a forged state signs nobody in', async ({ request }) => {
  const res = await request.get('/api/auth/callback/google?code=fake&state=forged', { maxRedirects: 0 });
  expect(res.status()).toBe(302);
  expect(res.headers().location).toContain('error=');
  expect(setCookies(res)).not.toContain('session_token');
});

test('an email account has no linked providers and can link Google', async ({ signIn }) => {
  const ann = await signIn('ann');
  const list = await ann.request.get('/api/auth/list-accounts', { headers: { origin: BASE_URL } });
  expect(list.status()).toBe(200);
  expect(await list.json()).toEqual([]);

  const link = await authPost(ann.request, '/link-social', { provider: 'google', callbackURL: '/account' });
  expect(link.status()).toBe(200);
  expect(new URL((await link.json()).url).origin).toBe('https://accounts.google.com');

  const unlink = await authPost(ann.request, '/unlink-account', { accountId: 'not-an-account' });
  expect(unlink.status()).toBe(400);
});
