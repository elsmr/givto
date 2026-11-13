// Language without a URL prefix on app pages (81): the right language from the first paint.
import type { Page } from '@playwright/test';
import { expect, ok, test } from '../fixtures';

const skipLink = { en: 'Skip to content', nl: 'Naar de inhoud' };
const dutch = { 'accept-language': 'nl-NL,nl;q=0.9' };

/** Every skip-link text painted (not hidden) on the next navigation, from the first frame. */
const recordPaints = (page: Page) =>
  page.addInitScript(() => {
    const painted: string[] = [];
    Object.assign(window, { painted });
    const tick = () => {
      const visible = document.body && getComputedStyle(document.body).visibility !== 'hidden';
      const text = visible && document.querySelector('a[href="#main"]')?.textContent;
      if (text && painted.at(-1) !== text) painted.push(text);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

const painted = (page: Page) => page.evaluate(() => (window as unknown as { painted: string[] }).painted);

test('an English account on an old /nl app link: /app, never Dutch', async ({ page, signIn, signInPage }) => {
  const ann = await signIn('ann');
  await signInPage(page, ann);
  await recordPaints(page);
  await page.goto('/nl/app');
  await expect(page).toHaveURL('/app');
  await expect(page.getByRole('heading', { name: 'My groups' })).toBeVisible();
  expect(await painted(page)).toEqual([skipLink.en]);
});

test('an English browser that chose Dutch: Dutch from the first paint, no prefix', async ({ page, signIn, baseURL }) => {
  const ann = await signIn('ann');
  const group = ok(await ann.trpc.mutate('group.create', { name: 'Taal', organizerName: 'Ann', timeZone: 'Europe/Brussels', exchangeMode: 'inPerson' }));
  await page.context().addCookies([{ name: 'NEXT_LOCALE', value: 'nl', url: baseURL }]);
  await recordPaints(page);
  await page.goto(`/nl/g/${group.slug}`);
  await expect(page).toHaveURL(`/auth/sign-in?redirect=%2Fg%2F${group.slug}`);
  await expect(page.getByRole('heading', { name: 'Inloggen' }).first()).toBeVisible();
  expect(await painted(page)).toEqual([skipLink.nl]);
});

test('a Dutch account in an English browser: Dutch once signed in, from the first paint after', async ({ page, signIn, signInPage }) => {
  const ann = await signIn('ann', { headers: dutch });
  await signInPage(page, ann);
  await page.goto('/app');
  await expect(page.getByRole('heading', { name: 'Nog geen groepen' })).toBeVisible();
  await recordPaints(page);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Nog geen groepen' })).toBeVisible();
  expect(await painted(page)).toEqual([skipLink.nl]);
  await expect(page).toHaveURL('/app');
});

test('old /nl app links redirect permanently, query kept; marketing pages keep /nl', async ({ request }) => {
  const get = (path: string) => request.get(path, { maxRedirects: 0 });
  const old = await get('/nl/g/abc/join?invite=xyz');
  expect(old.status()).toBe(308);
  expect(old.headers().location).toBe('/g/abc/join?invite=xyz');
  for (const path of ['/nl', '/nl/privacy', '/nl/pick']) expect((await get(path)).status(), path).toBe(200);
  for (const path of ['/nl//evil.example', '/nl/%5Cevil.example', '/nl/\\evil.example']) {
    expect(new URL((await get(path)).headers().location, 'http://localhost').host, path).toBe('localhost');
  }
});

test('join preview without cookie or browser language: the group’s language', async ({ request, signIn }) => {
  const ann = await signIn('ann', { headers: dutch });
  const group = ok(await ann.trpc.mutate('group.create', { name: 'Taal', organizerName: 'Ann', timeZone: 'Europe/Brussels', exchangeMode: 'inPerson' }));
  const html = await (await request.get(`/g/${group.slug}/join?token=${group.joinToken}`, { headers: { 'accept-language': '' } })).text();
  expect(html.match(/<html lang="(\w+)"/)?.[1]).toBe('nl');
  expect(html.match(/<title[^>]*>([^<]*)/)?.[1]).toBe('Ann nodigt je uit voor Taal');
});
