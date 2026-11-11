// SEO (37): meta tags, robots/sitemap, noindex, icons.
import type { APIRequestContext } from '@playwright/test';
import { expect, test } from '../fixtures';

const SITE = 'https://givto.app';

const get = async (request: APIRequestContext, path: string, headers: Record<string, string> = {}) => {
  const res = await request.get(path, { maxRedirects: 0, headers: { 'accept-language': 'en', ...headers } });
  return { res, body: await res.text() };
};

const tag = (html: string, pattern: RegExp) => html.match(pattern)?.[1];
const meta = (html: string, attr: string, key: string) => tag(html, new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`));
const hreflangs = (html: string) =>
  Object.fromEntries(
    [...html.matchAll(/<link rel="alternate" hrefLang="([^"]+)" href="([^"]+)"/g)].map(([, lang, href]) => [lang, href])
  );

const publicPages = [
  { path: '/', lang: 'en', url: `${SITE}/`, en: `${SITE}/`, nl: `${SITE}/nl`, jsonLd: true },
  { path: '/nl', lang: 'nl', url: `${SITE}/nl`, en: `${SITE}/`, nl: `${SITE}/nl`, jsonLd: true },
  { path: '/privacy', lang: 'en', url: `${SITE}/privacy`, en: `${SITE}/privacy`, nl: `${SITE}/nl/privacy`, jsonLd: false },
  { path: '/nl/privacy', lang: 'nl', url: `${SITE}/nl/privacy`, en: `${SITE}/privacy`, nl: `${SITE}/nl/privacy`, jsonLd: false },
];

for (const page of publicPages) {
  test(`${page.path}: indexable, canonical, hreflang, social cards`, async ({ request }) => {
    const { res, body } = await get(request, page.path);
    expect(res.status()).toBe(200);
    expect(tag(body, /<html lang="([^"]+)"/)).toBe(page.lang);
    expect(tag(body, /<title[^>]*>([^<]+)<\/title>/)).toContain('Givto');
    expect(meta(body, 'name', 'description')?.length).toBeGreaterThan(50);
    expect(body).not.toMatch(/name="robots"/);
    expect(tag(body, /<link rel="canonical" href="([^"]+)"/)).toBe(page.url);
    expect(hreflangs(body)).toEqual({ en: page.en, nl: page.nl, 'x-default': page.en });
    expect(meta(body, 'property', 'og:url')).toBe(page.url);
    expect(meta(body, 'property', 'og:image')).toBe(`${SITE}/og-image.png`);
    expect(meta(body, 'name', 'twitter:card')).toBe('summary_large_image');
    const jsonLd = tag(body, /<script type="application\/ld\+json">([^<]+)<\/script>/);
    if (page.jsonLd) {
      const data = JSON.parse(jsonLd!);
      expect(data['@type']).toBe('WebApplication');
      expect(data.url).toBe(page.url);
      expect(data.inLanguage).toBe(page.lang);
    } else {
      expect(jsonLd, 'JSON-LD only on home').toBeUndefined();
    }
  });
}

test('/ static HTML is the same signed in and out', async ({ request }) => {
  const signedOut = await get(request, '/');
  const withSession = await get(request, '/', { cookie: 'better-auth.session_token=smoke' });
  expect(withSession.body).toBe(signedOut.body);
  expect(signedOut.body).toMatch(/href="\/new"/);
});

test('/nl stays Dutch for a crawler without cookies', async ({ request }) => {
  const { res, body } = await get(request, '/nl', {
    'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'accept-language': '',
  });
  expect(res.status()).toBe(200);
  expect(tag(body, /<html lang="([^"]+)"/)).toBe('nl');
});

for (const path of ['/styleguide', '/auth/sign-in', '/does-not-exist', '/g/no-such-group', '/g/no-such-group/present']) {
  test(`${path}: noindex, no canonical or social cards`, async ({ request }) => {
    const { body } = await get(request, path);
    expect(meta(body, 'name', 'robots')).toBe('noindex');
    expect(body).not.toMatch(/rel="canonical"|og:url|application\/ld\+json/);
  });
}

test('/robots.txt allows crawling and points to the sitemap', async ({ request }) => {
  const { res, body } = await get(request, '/robots.txt');
  expect(res.status()).toBe(200);
  expect(body).toMatch(/^User-agent: \*$/m);
  expect(body).not.toMatch(/^Disallow: \/$/m);
  expect(body).toMatch(new RegExp(`^Sitemap: ${SITE}/sitemap.xml$`, 'm'));
});

test('/sitemap.xml lists exactly the public pages', async ({ request }) => {
  const { res, body } = await get(request, '/sitemap.xml');
  expect(res.status()).toBe(200);
  const locs = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, loc]) => loc);
  expect(locs.sort()).toEqual(publicPages.map(({ url }) => url).sort());
});

test('icons and manifest are served', async ({ request }) => {
  const types = {
    '/favicon.ico': 'image/x-icon',
    '/favicon.svg': 'image/svg+xml',
    '/apple-touch-icon.png': 'image/png',
    '/og-image.png': 'image/png',
    '/givto-logo.png': 'image/png',
  };
  for (const [path, type] of Object.entries(types)) {
    const { res } = await get(request, path);
    expect(res.status(), path).toBe(200);
    expect(res.headers()['content-type'], path).toBe(type);
  }
  const manifest = JSON.parse((await get(request, '/givto.webmanifest')).body);
  for (const { src } of manifest.icons) {
    expect((await get(request, src)).res.status(), src).toBe(200);
  }
});
