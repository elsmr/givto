// Shared fixtures for e2e specs. Import `test` and `expect` from here, not from @playwright/test.
// See e2e/README.md for the patterns.
import { test as base, expect, type APIRequestContext, type Page } from '@playwright/test';
import { MongoClient, type Db } from 'mongodb';
import { collections, type Collections } from '@/lib/server/db';
import { BASE_URL, MONGODB_DB, MONGODB_URI } from './env';
import { randomIp, requestSignIn, signInWithCode, uniqueEmail, type AuthOptions } from './support/auth';
import { latestMail, readSignInMail } from './support/mail';
import { expectNotLogged } from './support/server';
import { ok, trpcClient, type Trpc } from './support/trpc';

export { expect };
export * from './support/auth';
export * from './support/mail';
export * from './support/server';
export * from './support/trpc';

/** Its own cookie jar (a session, once signed in) and IP. */
export interface Client {
  request: APIRequestContext;
  trpc: Trpc;
}

export interface User extends Client {
  id: string;
  email: string;
}

/** Typed app collections, plus the raw Db for Better Auth's (`verifications`, `sessions`, `passkeys`, …). */
export type TestDb = Collections & { raw: Db };

interface TestFixtures {
  /** Emails, codes and tokens that must not show up in the server log; checked after the test. */
  secrets: string[];
  /** A fresh anonymous API client. */
  newClient: () => Promise<Client>;
  /** A new account (unique email `e2e-<name>-…`), signed in through the emailed code. */
  signIn: (name: string, options?: AuthOptions) => Promise<User>;
  /** Puts the user's session cookie into the page's browser context. */
  signInPage: (page: Page, user: User) => Promise<void>;
  /** Signs in through the real form on the current page (email → code from the mail mock). */
  signInWithUi: (page: Page, email: string) => Promise<void>;
}

interface WorkerFixtures {
  db: TestDb;
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  // A fresh IP per test for the browser and `request`: rate limits are per IP.
  extraHTTPHeaders: async ({}, use) => use({ 'x-forwarded-for': randomIp() }),

  secrets: async ({}, use) => {
    const secrets: string[] = [];
    await use(secrets);
    expectNotLogged(secrets);
  },

  newClient: async ({ playwright }, use) => {
    const contexts: APIRequestContext[] = [];
    await use(async () => {
      const request = await playwright.request.newContext({
        baseURL: BASE_URL,
        extraHTTPHeaders: { 'x-forwarded-for': randomIp() },
      });
      contexts.push(request);
      return { request, trpc: trpcClient(request) };
    });
    await Promise.all(contexts.map((context) => context.dispose()));
  },

  signIn: async ({ newClient, secrets }, use) => {
    await use(async (name, options) => {
      const client = await newClient();
      const email = uniqueEmail(name);
      const { code, token } = await requestSignIn(client.request, email, options);
      secrets.push(email, code, token);
      const res = await signInWithCode(client.request, email, code, options);
      expect(res.status(), await res.text()).toBe(200);
      const me = ok(await client.trpc.query('me.get'));
      return { ...client, id: me.id, email };
    });
  },

  signInPage: async ({}, use) => {
    await use(async (page, user) => {
      await page.context().addCookies((await user.request.storageState()).cookies);
    });
  },

  signInWithUi: async ({ secrets }, use) => {
    await use(async (page, email) => {
      secrets.push(email);
      await page.getByLabel('Email').fill(email);
      await page.getByRole('button', { name: 'Email me a code' }).click();
      const { code, token } = readSignInMail(await latestMail(email));
      secrets.push(code, token);
      await page.getByLabel('6-digit code').fill(code);
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    });
  },

  db: [
    async ({}, use) => {
      const client = await new MongoClient(MONGODB_URI).connect();
      const raw = client.db(MONGODB_DB);
      await use({ ...collections(raw), raw });
      await client.close();
    },
    { scope: 'worker' },
  ],
});
