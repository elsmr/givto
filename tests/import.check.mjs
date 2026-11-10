// URL import checks (39), no network: saved shop pages → fields, URL cleanup, and the SSRF
// boundary. Run: node --import ./tests/ts-hooks.mjs tests/import.check.mjs.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { gzipSync } from 'node:zlib';
import { isBlockedAddress } from '../lib/server/import/blocked-address.ts';
import { cleanProductUrl, titleFromUrl } from '../lib/server/import/clean-url.ts';
import { extractProduct } from '../lib/server/import/extract-product.ts';
import { firstSentence } from '../lib/server/import/html-text.ts';
import { importProduct } from '../lib/server/import/import-product.ts';
import { parseAmount } from '../lib/server/import/parse-price.ts';
import { sendPinned } from '../lib/server/import/pinned-request.ts';
import { FETCH_LIMITS, ImportError, safeFetch } from '../lib/server/import/safe-fetch.ts';
import { sniffImageType } from '../lib/server/import/wish-images.ts';

const check = async (name, fn) => {
  await fn();
  console.log(`ok  ${name}`);
};
const fixture = (name) => readFileSync(new URL(`./fixtures/import/${name}.html`, import.meta.url), 'utf8');
const rejects = (promise, reason) =>
  assert.rejects(promise, (error) => error instanceof ImportError && error.reason === reason);

await check('import fixtures: bol.com (JSON-LD, HTML in description)', () => {
  const bol = extractProduct(fixture('bol'), 'https://www.bol.com/nl/nl/p/x/9300000031853451/');
  assert.equal(bol.title, 'FORD - M2AD - GRIS MAGNUM-MET. - autolak spuitbus 400ml');
  assert.deepEqual(bol.price, { currency: 'EUR', amount: 3375 });
  assert.equal(bol.imageUrl, 'https://media.s-bol.com/lyZYglN0OEP7/4xJoXBV/943x1200.jpg');
  assert.match(bol.description, /^Spuitbus Ford autolak, 400ml\. Breedstraal/);
  assert.doesNotMatch(bol.description, /<|>/);
});

await check('import fixtures: Amazon .nl/.de (title + main image, no buy box: no price), .fr (buy box price)', () => {
  const image = 'https://m.media-amazon.com/images/I/61O3iMlnJIL._AC_SL1500_.jpg';
  const nl = extractProduct(fixture('amazon-nl'), 'https://www.amazon.nl/dp/B09XS7JWHH');
  assert.match(nl.title, /^Sony WH-1000XM5 draadloze .* zwart$/);
  assert.deepEqual([nl.description, nl.price, nl.imageUrl], [undefined, undefined, image], 'description repeating the title is dropped');
  const de = extractProduct(fixture('amazon-de'), 'https://www.amazon.de/dp/B09XS7JWHH');
  assert.deepEqual(de, { title: 'Sony WH-1000XM5 draadloos, toonaangevende', imageUrl: image });
  const fr = extractProduct(fixture('amazon-fr'), 'https://www.amazon.fr/dp/B09XS7JWHH');
  assert.match(fr.title, /^Sony WH-1000XM5 Wireless .* Black$/);
  assert.deepEqual(fr.price, { currency: 'EUR', amount: 44365 });
  assert.equal(fr.imageUrl, image);
});

await check('import fixtures: IKEA (JSON-LD, shop suffix in og:title not used)', () => {
  const ikea = extractProduct(fixture('ikea'), 'https://www.ikea.com/nl/nl/p/billy-boekenkast-wit-00263850/');
  assert.equal(ikea.title, 'BILLY Boekenkast - wit 80x28x202 cm');
  assert.deepEqual(ikea.price, { currency: 'EUR', amount: 4999 });
  assert.match(ikea.imageUrl, /^https:\/\/www\.ikea\.com\/nl\/nl\/images\/products\/billy-boekenkast-wit__/);
  assert.match(ikea.description, /^BILLY Boekenkast - wit 80x28x202 cm\. Verstelbare planken/);
});

await check('import fixtures: microdata (scoped to the Product, relative image, price from content)', () => {
  assert.deepEqual(extractProduct(fixture('microdata'), 'https://www.deklei.be/winkel/theepot/'), {
    title: 'Handgemaakte theepot, 1 liter',
    description: 'Gedraaid en geglazuurd in ons atelier in Gent.',
    price: { currency: 'EUR', amount: 6450 },
    imageUrl: 'https://www.deklei.be/wp-content/uploads/theepot-800x800.jpg',
  });
});

await check('import: shop names dropped from titles', () => {
  const titleOf = (title, url) => extractProduct(`<title>${title}</title>`, url).title;
  assert.equal(titleOf('Lenovo Tab P11 | Coolblue | Tablets', 'https://www.coolblue.nl/product/1'), 'Lenovo Tab P11');
  assert.equal(titleOf('BILLY boekenkast, wit  - IKEA', 'https://www.ikea.com/nl/nl/p/x/'), 'BILLY boekenkast, wit');
  assert.equal(titleOf('Lego Creator | bol', 'https://www.bol.com/nl/nl/p/x/1/'), 'Lego Creator');
  assert.equal(titleOf('Amazon.co.uk: Sony WH-1000XM5 : Electronics', 'https://www.amazon.co.uk/dp/B09XS7JWHH'), 'Sony WH-1000XM5 : Electronics');
  assert.equal(titleOf('Sony WH-1000XM5: Amazon.de: Elektronica', 'https://www.amazon.de/dp/B09XS7JWHH'), 'Sony WH-1000XM5');
  assert.equal(titleOf('Air Force 1 – Zalando', 'https://www.zalando.nl/x.html'), 'Air Force 1');
  assert.equal(titleOf('IKEA PS 2014 lamp', 'https://www.ikea.com/nl/nl/p/x/'), 'IKEA PS 2014 lamp', 'a leading shop name without a colon stays');
});

await check('import: a title guessed from the URL for pages we can\'t read', () => {
  const cases = {
    'https://www.zalando.nl/nike-sportswear-air-force-1-07-sneakers-laag-white-ni112o0bt-a11.html': 'Nike sportswear air force 1 07 sneakers laag white',
    'https://www.mediamarkt.nl/nl/product/_sony-wh-1000xm5-zwart-1716297.html': 'Sony wh 1000xm5 zwart',
    'https://www.lego.com/nl-nl/product/the-razor-crest-75331': 'The razor crest 75331',
    'https://www.bol.com/nl/nl/p/ford-m2ad-gris-magnum-met-autolak-spuibus-400ml/9300000031853451/': 'Ford m2ad gris magnum met autolak spuibus 400ml',
    'https://www.amazon.nl/Sony-WH-1000XM5-draadloze-hoofdtelefoon/dp/B09XS7JWHH?th=1': 'Sony WH 1000XM5 draadloze hoofdtelefoon',
    'https://www.etsy.com/listing/1063497432/personalised-leather-wallet': 'Personalised leather wallet',
    'https://www.etsy.com/listing/1063497432/': undefined,
    'https://www.amazon.com/dp/B09XS7JWHH': undefined,
  };
  for (const [url, title] of Object.entries(cases)) assert.equal(titleFromUrl(url), title, url);
});

await check('import fixtures: Coolblue (JSON-LD among other blocks, numeric price)', () => {
  const coolblue = extractProduct(fixture('coolblue'), 'https://www.coolblue.nl/product/914357/');
  assert.equal(coolblue.title, 'Lenovo Tab P11 Pro 128GB Wifi + 4G Grijs + Keyboard Cover QWERTY Grijs');
  assert.deepEqual(coolblue.price, { currency: 'EUR', amount: 51400 });
  assert.equal(coolblue.imageUrl, 'https://image.coolblue.nl/500x500/products/1810197');
  assert.match(coolblue.description, /beschadigingen, zodat/);
});

await check('import fixtures: Etsy (AggregateOffer range, ImageObject, entity-encoded HTML)', () => {
  const etsy = extractProduct(fixture('etsy'), 'https://www.etsy.com/uk/listing/1063497432/');
  assert.equal(etsy.title, 'Personalised Leather Wallet, Engraved Mens Wallet');
  assert.deepEqual(etsy.price, { currency: 'GBP', amount: 2400, maxAmount: 3950 });
  assert.match(etsy.imageUrl, /il_fullxfull/);
  assert.equal(etsy.description, 'Hand-stitched full-grain leather wallet. Engraved with up to 3 initials & a date. Colours: tan, brown or black.');
});

await check('import fixtures: plain blog (OpenGraph, no price)', () => {
  const blog = extractProduct(fixture('blog'), 'https://www.hanselman.com/blog/');
  assert.deepEqual(blog, {
    title: 'Scott Hanselman',
    description: 'Scott Hanselman is blogging about open source, .NET, and the cloud.',
    imageUrl: 'https://pbs.twimg.com/profile_images/1133122333290291200/xV9gO-D6_400x400.jpg',
  });
});

await check('import: fallback to <title>, relative image, script text stays text', () => {
  const html = `<title>Mug &lt;script&gt;alert(1)&lt;/script&gt;</title><img src="/m.jpg" width="400" height="300">`;
  assert.deepEqual(extractProduct(html, 'https://shop.test/p/1'), {
    title: 'Mug alert(1)',
    imageUrl: 'https://shop.test/m.jpg',
  });
  assert.equal(extractProduct('<meta property="og:image" content="javascript:alert(1)">', 'https://s.test/').imageUrl, undefined);
});

await check('import: tracking parameters stripped', () => {
  assert.equal(
    cleanProductUrl('https://www.amazon.nl/Sony-WH-1000XM5/dp/B09XS7JWHH/ref=sr_1_3?keywords=sony&qid=1&tag=aff-21#x'),
    'https://www.amazon.nl/dp/B09XS7JWHH'
  );
  assert.equal(
    cleanProductUrl('https://www.bol.com/nl/nl/p/lego/930/?bltgh=abc&utm_source=x&gclid=1&size=M'),
    'https://www.bol.com/nl/nl/p/lego/930/?size=M'
  );
  assert.equal(
    cleanProductUrl('https://www.etsy.com/listing/1/x?ref=hp&click_key=a&variation=2'),
    'https://www.etsy.com/listing/1/x?variation=2'
  );
});

await check('import: prices in cents', () => {
  const cases = { '24.99': 2499, '24,99': 2499, '1.299,00': 129900, '1,299.00': 129900, '€ 25,-': 2500, '1.299': 129900 };
  for (const [text, cents] of Object.entries(cases)) assert.equal(parseAmount(text), cents, text);
  assert.equal(parseAmount(514), 51400);
  assert.equal(parseAmount('free'), undefined);
});

await check('import: image types sniffed from bytes (no SVG, no HTML)', () => {
  assert.equal(sniffImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), 'image/jpeg');
  assert.equal(sniffImageType(Buffer.from('RIFF0000WEBPVP8 ')), 'image/webp');
  assert.equal(sniffImageType(Buffer.from('<svg onload="alert(1)">')), null);
  assert.equal(sniffImageType(Buffer.from('<html>')), null);
});

await check('SSRF: blocked address ranges', () => {
  for (const address of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', '::', 'fe80::1', 'fd00:ec2::254', '::ffff:127.0.0.1', '0:0:0:0:0:ffff:a9fe:a9fe', '64:ff9b::a00:1', '2002:7f00:1::1']) {
    assert.ok(isBlockedAddress(address), address);
  }
  for (const address of ['93.184.216.34', '8.8.8.8', '2606:2800:220:1:248:1893:25c8:1946']) assert.ok(!isBlockedAddress(address), address);
});

await check('SSRF: localhost, 127.0.0.1, [::1], 169.254.169.254 and friends rejected before connecting', async () => {
  for (const url of [
    'http://localhost/',
    'http://127.0.0.1/',
    'http://[::1]/',
    'http://169.254.169.254/latest/meta-data/',
    'http://2130706433/',
    'http://0x7f.0.0.1/',
    'http://[::ffff:127.0.0.1]/',
    'http://user:pass@example.com/',
    'http://example.com:8080/',
    'ftp://example.com/',
    'file:///etc/passwd',
  ]) {
    await rejects(safeFetch(url, 'page'), 'blocked');
  }
});

// A simulated internet: DNS answers and responses, no sockets. Records where we "connected".
const connected = [];
const dns = { 'shop.test': ['93.184.216.34'], 'evil.test': ['10.0.0.7'], 'mixed.test': ['93.184.216.34', '127.0.0.1'] };
const html = (body) => ({ status: 200, headers: { 'content-type': 'text/html; charset=utf-8' }, body: Readable.from([Buffer.from(body)]) });
const redirect = (location) => ({ status: 302, headers: { location }, body: Readable.from([]) });
const routes = {
  '/ok': () => html('<title>Teapot</title>'),
  '/to-metadata': () => redirect('http://169.254.169.254/latest/meta-data/'),
  '/to-private-name': () => redirect('http://evil.test/'),
  '/to-ipv6-loopback': () => redirect('http://[::1]/'),
  '/r1': () => redirect('/r2'),
  '/r2': () => redirect('/r3'),
  '/r3': () => redirect('/ok'),
  '/r0': () => redirect('/r1'),
  '/json': () => ({ status: 200, headers: { 'content-type': 'application/json' }, body: Readable.from([Buffer.from('{}')]) }),
  '/missing': () => ({ status: 404, headers: { 'content-type': 'text/html' }, body: Readable.from([]) }),
  '/big': () => html(Buffer.alloc(FETCH_LIMITS.maxBytes + 1, 'a')),
  '/big.png': () => ({ status: 200, headers: { 'content-type': 'image/png' }, body: Readable.from([Buffer.alloc(FETCH_LIMITS.maxBytes + 1)]) }),
  '/walled': () => ({ status: 403, headers: { 'content-type': 'text/html' }, body: Readable.from([Buffer.from(fixture('zalando-bot-wall'))]) }),
  '/gzip-bomb': () => ({
    status: 200,
    headers: { 'content-type': 'text/html', 'content-encoding': 'gzip' },
    body: Readable.from([gzipSync(Buffer.alloc(20 * 1024 * 1024))]),
  }),
  '/slow': () => new Promise(() => {}),
};
const sentHeaders = [];
const fake = {
  resolve: async (hostname) => dns[hostname] ?? Promise.reject(new Error('ENOTFOUND')),
  send: async (url, address, headers) => {
    connected.push(address);
    sentHeaders.push(headers);
    return routes[url.pathname]();
  },
};

await check('SSRF: DNS name resolving to a private IP rejected (also when one of several is)', async () => {
  await rejects(safeFetch('http://evil.test/', 'page', fake), 'blocked');
  await rejects(safeFetch('http://mixed.test/ok', 'page', fake), 'blocked');
  assert.deepEqual(connected, []);
});

await check('SSRF: redirect to a private IP or name re-validated and rejected', async () => {
  await rejects(safeFetch('http://shop.test/to-metadata', 'page', fake), 'blocked');
  await rejects(safeFetch('http://shop.test/to-private-name', 'page', fake), 'blocked');
  await rejects(safeFetch('https://shop.test/to-ipv6-loopback', 'page', fake), 'blocked');
  assert.ok(connected.every((address) => address === '93.184.216.34'), connected.join());
});

await check('SSRF: max 3 redirects, then the page', async () => {
  const page = await safeFetch('https://shop.test/r1', 'page', fake);
  assert.equal(page.url, 'https://shop.test/ok');
  assert.equal(page.body.toString(), '<title>Teapot</title>');
  await rejects(safeFetch('https://shop.test/r0', 'page', fake), 'too_many_redirects');
});

await check('fetch limits: HTML only, size cap (pages cut off, also after gzip; images rejected), HTTP errors, timeout', async () => {
  await rejects(safeFetch('https://shop.test/json', 'page', fake), 'unsupported_type');
  await rejects(safeFetch('https://shop.test/ok', 'image', fake), 'unsupported_type');
  await rejects(safeFetch('https://shop.test/missing', 'page', fake), 'http_error');
  assert.equal((await safeFetch('https://shop.test/big', 'page', fake)).body.length, FETCH_LIMITS.maxBytes);
  assert.equal((await safeFetch('https://shop.test/gzip-bomb', 'page', fake)).body.length, FETCH_LIMITS.maxBytes);
  await rejects(safeFetch('https://shop.test/big.png', 'image', fake), 'too_large');
  const timeout = FETCH_LIMITS.timeoutMs;
  FETCH_LIMITS.timeoutMs = 200;
  const keepAlive = setTimeout(() => {}, 1000); // AbortSignal.timeout doesn't keep node running
  await rejects(safeFetch('https://shop.test/slow', 'page', fake), 'timeout');
  clearTimeout(keepAlive);
  FETCH_LIMITS.timeoutMs = timeout;
});

await check('pinned request connects to the validated address, not a fresh DNS answer', async () => {
  const server = createServer((req, res) => res.end(`host=${req.headers.host}`));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  // "pinned.invalid" never resolves, so reaching the server proves the socket used our address.
  const response = await sendPinned(new URL(`http://pinned.invalid:${port}/`), '127.0.0.1', {}, AbortSignal.timeout(2000));
  const chunks = [];
  for await (const chunk of response.body) chunks.push(chunk);
  assert.equal(Buffer.concat(chunks).toString(), `host=pinned.invalid:${port}`);
  server.close();
});

await check('fetch: a browser\'s headers (several shops wall off anything else)', async () => {
  sentHeaders.length = 0;
  await safeFetch('https://shop.test/ok', 'page', fake);
  assert.match(sentHeaders[0]['user-agent'], /^Mozilla\/5\.0 .* Chrome\/[\d.]+ Safari\/[\d.]+$/);
  assert.match(sentHeaders[0]['accept-language'], /^nl-NL,nl;q=0\.9,en/);
  assert.match(sentHeaders[0].accept, /^text\/html,/);
});

// Shops on the simulated internet: pages by host + path, from the saved fixtures.
const shopDns = { 'amzn.to': ['54.239.28.85'], 'www.amazon.nl': ['54.239.28.85'], 'www.amazon.com': ['54.239.28.85'], 'www.lego.com': ['104.18.1.1'], 'www.zalando.nl': ['2.16.1.1'], 'www.etsy.com': ['151.101.1.1'], 'www.mediamarkt.nl': ['104.18.2.2'] };
const page = (name, status = 200) => () => ({ status, headers: { 'content-type': 'text/html; charset=utf-8' }, body: Readable.from([Buffer.from(fixture(name))]) });
const shopRoutes = {
  'amzn.to/3xYzAbC': () => redirect('https://www.amazon.nl/dp/B09XS7JWHH?tag=givto-21&linkCode=sl1&linkId=abc'),
  'www.amazon.nl/dp/B09XS7JWHH': page('amazon-nl'),
  'www.amazon.com/dp/B09XS7JWHH': page('amazon-com-bot-wall'),
  'www.lego.com/nl-nl/product/the-razor-crest-75331': page('lego-bot-wall'),
  'www.zalando.nl/nike-sportswear-air-force-1-07-sneakers-laag-white-ni112o0bt-a11.html': page('zalando-bot-wall', 403),
  'www.etsy.com/listing/1063497432/': page('etsy-bot-wall', 403),
  'www.mediamarkt.nl/nl/product/_sony-wh-1000xm5-zwart-1716297.html': page('mediamarkt-bot-wall', 403),
};
const shops = {
  resolve: async (hostname) => shopDns[hostname] ?? Promise.reject(new Error('ENOTFOUND')),
  send: async (url) => (shopRoutes[url.host + url.pathname] ?? page('blog', 404))(),
};
const rejectsBotWall = (promise, url) =>
  assert.rejects(promise, (error) => error instanceof ImportError && error.reason === 'bot_wall' && error.url === url);

await check('import: short links (amzn.to) followed to the product; the stored link is clean', async () => {
  const imported = await importProduct('https://amzn.to/3xYzAbC', '0123456789abcdef01234567', shops);
  assert.equal(imported.url, 'https://www.amazon.nl/dp/B09XS7JWHH');
  assert.match(imported.title, /^Sony WH-1000XM5 draadloze/);
  assert.equal(imported.imageId, undefined, 'the image failed (404 here), the import did not');
});

await check('import: bot walls (403 or a challenge page with a 200) are "bot_wall", with the address reached', async () => {
  for (const url of [
    'https://www.zalando.nl/nike-sportswear-air-force-1-07-sneakers-laag-white-ni112o0bt-a11.html',
    'https://www.etsy.com/listing/1063497432/',
    'https://www.mediamarkt.nl/nl/product/_sony-wh-1000xm5-zwart-1716297.html',
    'https://www.amazon.com/dp/B09XS7JWHH',
    'https://www.lego.com/nl-nl/product/the-razor-crest-75331',
  ]) {
    await rejectsBotWall(importProduct(url, '0123456789abcdef01234567', shops), url);
  }
});

await check('import: only the first sentence of a shop description, at most 200 characters', () => {
  assert.equal(firstSentence('Warm socks. Machine washable. Made in Portugal.', 200), 'Warm socks.');
  assert.equal(firstSentence('Version 2.0 is here! Order now.', 200), 'Version 2.0 is here!');
  assert.equal(firstSentence('No full stop at all', 200), 'No full stop at all');
  const long = firstSentence(extractProduct(fixture('bol'), 'https://www.bol.com/nl/nl/p/x/9300000031853451/').description, 200);
  assert.ok(long && long.length <= 200, `bol: ${long?.length}`);
  const cut = firstSentence('word '.repeat(60), 200);
  assert.ok(cut.endsWith('…') && !cut.endsWith(' …') && cut.length <= 200, cut);
  assert.equal(firstSentence(undefined, 200), undefined);
});
