// Run: pnpm test (or node --import ./tests/ts-hooks.mjs tests/http-url.check.mjs)
import assert from 'node:assert/strict';
import * as v from 'valibot';
import { toIcs } from '../lib/calendar.ts';
import { HttpUrl } from '../lib/schema/common.ts';
import { cleanHttpUrl } from '../migrations/008-http-urls.ts';

const accepts = (url) => v.safeParse(HttpUrl, url).success;

for (const url of ['https://shop.example/socks?size=42&c=red#x', 'http://a.example', '  https://a.example/b  ', "https://en.wikipedia.org/wiki/Ender's_Game", 'https://a.example/a%20b']) {
  assert.ok(accepts(url), `rejected: ${JSON.stringify(url)}`);
}
for (const url of [
  'https://shop.example/a\r\nX-Injected: 1',
  'https://shop.example/a\rb',
  'https://shop.example/a\tb',
  'https://shop.example/a b',
  'https://shop.example/a\u00a0b',
  'https://shop.example/a"onmouseover="alert(1)',
  'https://shop.example/<script>',
  'https://shop.example/a\u0000',
  'javascript:alert(1)',
  'ftp://a.example',
]) {
  assert.ok(!accepts(url), `accepted: ${JSON.stringify(url)}`);
}

for (const [stored, expected] of [
  ['https://shop.example/a b', 'https://shop.example/a%20b'],
  ['https://shop.example/a"b<c>', 'https://shop.example/a%22b%3Cc%3E'],
  ['https://shop.example/a\r\nb\tc', 'https://shop.example/abc'],
  ["https://en.wikipedia.org/wiki/Ender's_Game", "https://en.wikipedia.org/wiki/Ender's_Game"],
  ['https://sho p.example/a', undefined],
]) {
  assert.equal(cleanHttpUrl(stored), expected, `cleaned: ${JSON.stringify(stored)}`);
}

const ics = toIcs([{ uid: 'x', sequence: 0, title: 'T', date: '2026-12-24', timeZone: 'UTC', description: 'a\rb\r\nc\nd' }]);
assert.match(ics, /DESCRIPTION:a\\nb\\nc\\nd\r\n/);
assert.doesNotMatch(ics, /\r(?!\n)/, 'a bare CR in the ICS');
console.log('http-url check ok');
