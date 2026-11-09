// S8 smoke: SEO tags, robots/sitemap, noindex and icons against a running `next start` (37).
// Run: BASE_URL=http://localhost:4201 pnpm test:smoke:s8
import assert from 'node:assert/strict';

const BASE = process.env.BASE_URL ?? 'http://localhost:4201';
const SITE = 'https://givto.app';

const step = async (name, fn) => {
  await fn();
  console.log(`ok  ${name}`);
};

const get = async (path, headers = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    redirect: 'manual',
    headers: { 'accept-language': 'en', ...headers },
  });
  return { res, body: await res.text() };
};

const tag = (html, pattern) => html.match(pattern)?.[1];
const meta = (html, attr, key) =>
  tag(html, new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`));
const hreflangs = (html) =>
  Object.fromEntries(
    [...html.matchAll(/<link rel="alternate" hrefLang="([^"]+)" href="([^"]+)"/g)].map(
      ([, lang, href]) => [lang, href],
    ),
  );

const publicPages = [
  { path: '/', lang: 'en', url: `${SITE}/`, en: `${SITE}/`, nl: `${SITE}/nl`, jsonLd: true },
  { path: '/nl', lang: 'nl', url: `${SITE}/nl`, en: `${SITE}/`, nl: `${SITE}/nl`, jsonLd: true },
  { path: '/privacy', lang: 'en', url: `${SITE}/privacy`, en: `${SITE}/privacy`, nl: `${SITE}/nl/privacy` },
  { path: '/nl/privacy', lang: 'nl', url: `${SITE}/nl/privacy`, en: `${SITE}/privacy`, nl: `${SITE}/nl/privacy` },
];

for (const page of publicPages) {
  await step(`${page.path}: indexable, canonical, hreflang, social cards`, async () => {
    const { res, body } = await get(page.path);
    assert.equal(res.status, 200);
    assert.equal(tag(body, /<html lang="([^"]+)"/), page.lang);
    assert.ok(tag(body, /<title[^>]*>([^<]+)<\/title>/)?.includes('Givto'));
    assert.ok(meta(body, 'name', 'description')?.length > 50);
    assert.doesNotMatch(body, /name="robots"/);
    assert.equal(tag(body, /<link rel="canonical" href="([^"]+)"/), page.url);
    assert.deepEqual(hreflangs(body), { en: page.en, nl: page.nl, 'x-default': page.en });
    assert.equal(meta(body, 'property', 'og:url'), page.url);
    assert.equal(meta(body, 'property', 'og:image'), `${SITE}/og-image.png`);
    assert.equal(meta(body, 'name', 'twitter:card'), 'summary_large_image');
    const jsonLd = tag(body, /<script type="application\/ld\+json">([^<]+)<\/script>/);
    if (page.jsonLd) {
      const data = JSON.parse(jsonLd);
      assert.equal(data['@type'], 'WebApplication');
      assert.equal(data.url, page.url);
      assert.equal(data.inLanguage, page.lang);
    } else {
      assert.equal(jsonLd, undefined, 'JSON-LD only on home');
    }
  });
}

await step('/ static HTML is the same signed in and out', async () => {
  const signedOut = await get('/');
  const withSession = await get('/', { cookie: 'better-auth.session_token=smoke' });
  assert.equal(withSession.body, signedOut.body);
  assert.match(signedOut.body, /href="\/new"/);
});

await step('/nl stays Dutch for a crawler without cookies', async () => {
  const { res, body } = await get('/nl', {
    'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'accept-language': '',
  });
  assert.equal(res.status, 200);
  assert.equal(tag(body, /<html lang="([^"]+)"/), 'nl');
});

for (const path of ['/styleguide', '/auth/sign-in', '/nl/auth/passkeys', '/does-not-exist']) {
  await step(`${path}: noindex, no canonical or social cards`, async () => {
    const { body } = await get(path);
    assert.equal(meta(body, 'name', 'robots'), 'noindex');
    assert.doesNotMatch(body, /rel="canonical"|og:url|application\/ld\+json/);
  });
}

await step('/robots.txt allows crawling and points to the sitemap', async () => {
  const { res, body } = await get('/robots.txt');
  assert.equal(res.status, 200);
  assert.match(body, /^User-agent: \*$/m);
  assert.doesNotMatch(body, /^Disallow: \/$/m);
  assert.match(body, new RegExp(`^Sitemap: ${SITE}/sitemap.xml$`, 'm'));
});

await step('/sitemap.xml lists exactly the public pages', async () => {
  const { res, body } = await get('/sitemap.xml');
  assert.equal(res.status, 200);
  const locs = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, loc]) => loc);
  assert.deepEqual(locs.sort(), publicPages.map(({ url }) => url).sort());
});

await step('icons and manifest are served', async () => {
  const types = {
    '/favicon.ico': 'image/x-icon',
    '/favicon.svg': 'image/svg+xml',
    '/apple-touch-icon.png': 'image/png',
    '/og-image.png': 'image/png',
    '/givto-logo.png': 'image/png',
  };
  for (const [path, type] of Object.entries(types)) {
    const { res } = await get(path);
    assert.equal(res.status, 200, path);
    assert.equal(res.headers.get('content-type'), type, path);
  }
  const manifest = JSON.parse((await get('/givto.webmanifest')).body);
  for (const { src } of manifest.icons) {
    assert.equal((await get(src)).res.status, 200, src);
  }
});

console.log('s8 smoke passed');
