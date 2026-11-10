// URL import checks (39), no network: saved shop pages → fields, URL cleanup, and the SSRF
// boundary. Run: node --import ./tests/ts-hooks.mjs tests/import.check.mjs.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { gzipSync } from 'node:zlib';
import { isBlockedAddress } from '../lib/server/import/blocked-address.ts';
import { cleanProductUrl } from '../lib/server/import/clean-url.ts';
import { extractProduct } from '../lib/server/import/extract-product.ts';
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

await check('import fixtures: Amazon (title + main image fallback, store suffix dropped)', () => {
  const amazon = extractProduct(fixture('amazon'), 'https://www.amazon.nl/dp/B09XS7JWHH');
  assert.match(amazon.title, /^Sony WH-1000XM5 draadloze .* zwart$/);
  assert.equal(amazon.description, undefined, 'description that repeats the title is dropped');
  assert.equal(amazon.price, undefined);
  assert.equal(amazon.imageUrl, 'https://m.media-amazon.com/images/I/61O3iMlnJIL._AC_SL1500_.jpg');
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
  '/gzip-bomb': () => ({
    status: 200,
    headers: { 'content-type': 'text/html', 'content-encoding': 'gzip' },
    body: Readable.from([gzipSync(Buffer.alloc(20 * 1024 * 1024))]),
  }),
  '/slow': () => new Promise(() => {}),
};
const fake = {
  resolve: async (hostname) => dns[hostname] ?? Promise.reject(new Error('ENOTFOUND')),
  send: async (url, address) => {
    connected.push(address);
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

await check('fetch limits: HTML only, size cap (also after gzip), HTTP errors, timeout', async () => {
  await rejects(safeFetch('https://shop.test/json', 'page', fake), 'unsupported_type');
  await rejects(safeFetch('https://shop.test/ok', 'image', fake), 'unsupported_type');
  await rejects(safeFetch('https://shop.test/missing', 'page', fake), 'http_error');
  await rejects(safeFetch('https://shop.test/big', 'page', fake), 'too_large');
  await rejects(safeFetch('https://shop.test/gzip-bomb', 'page', fake), 'too_large');
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
