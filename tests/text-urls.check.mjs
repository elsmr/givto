// Run: pnpm test (or node --import ./tests/ts-hooks.mjs tests/text-urls.check.mjs)
import assert from 'node:assert/strict';
import { findUrls, removeUrls } from '../components/wishlist/text-urls.ts';

assert.deepEqual(findUrls('no links here'), []);
assert.deepEqual(findUrls('Socks https://shop.example/socks, or (http://b.example/x).'), ['https://shop.example/socks', 'http://b.example/x']);
assert.deepEqual(findUrls('ftp://x.example www.y.example'), [], 'only http(s), with the scheme');

assert.equal(removeUrls('https://shop.example/socks', ['https://shop.example/socks']), '');
assert.equal(removeUrls('Wool socks https://shop.example/socks size 42', ['https://shop.example/socks']), 'Wool socks size 42');
assert.equal(removeUrls('Like https://a.example/b.', ['https://a.example/b']), 'Like.');
assert.equal(removeUrls('Line one\nhttps://a.example\nLine two', ['https://a.example']), 'Line one\nLine two');
assert.equal(
  removeUrls('https://a.example https://a.example/longer', ['https://a.example', 'https://a.example/longer']),
  '',
  'a URL that starts with another one goes whole'
);
assert.equal(removeUrls('Keep http://127.0.0.1/admin', []), 'Keep http://127.0.0.1/admin', 'URLs not passed stay');
console.log('text-urls check ok');
