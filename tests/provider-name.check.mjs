// Run: pnpm test (or node --import ./tests/ts-hooks.mjs tests/provider-name.check.mjs)
import assert from 'node:assert/strict';
import { providerName } from '../lib/server/auth.ts';

assert.equal(providerName('  Ann Smith '), 'Ann Smith');
for (const name of [undefined, '', 'x'.repeat(51), 'Ann\nSmith']) assert.equal(providerName(name), '');
console.log('provider name check ok');
