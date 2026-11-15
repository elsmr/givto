// Run: pnpm test (or node --import ./tests/ts-hooks.mjs tests/edition-title.check.mjs)
import assert from 'node:assert/strict';
import { titleForKind } from '../lib/schema/edition.ts';

assert.equal(titleForKind('White Elephant 2026', 'whiteElephant', 'secretSanta', []), 'Secret Santa 2026');
assert.equal(titleForKind('White elephant 2026', 'whiteElephant', 'conspiracy', []), 'Conspiracy Santa 2026');
assert.equal(titleForKind('White Elephant 2026 (2)', 'whiteElephant', 'secretSanta', ['Secret Santa 2026']), 'Secret Santa 2026 (2)');
assert.equal(titleForKind('Conspiracy Santa 2027', 'conspiracy', 'secretSanta', ['Secret Santa 2027', 'Secret Santa 2027 (2)']), 'Secret Santa 2027 (3)');
assert.equal(titleForKind('Office swap 2026', 'whiteElephant', 'secretSanta', []), 'Office swap 2026');
assert.equal(titleForKind('Secret Santa 2026', 'whiteElephant', 'conspiracy', []), 'Secret Santa 2026');
console.log('edition title check ok');
