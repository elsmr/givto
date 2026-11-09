// Run: pnpm test (or node tests/names.check.mjs)
import assert from 'node:assert/strict';
import * as v from 'valibot';
import { PersonName } from '../lib/schema/common.ts';

const accepts = (name) => v.safeParse(PersonName, name).success;

for (const name of ['Ann', 'Ann.Smith', 'J. R. Tolkien', 'St.Clair', 'Anne-Marie', 'Zoë van der Berg', 'Dr. Who']) {
  assert.ok(accepts(name), `rejected: ${name}`);
}
for (const name of ['http://evil.test', 'evil.com', 'EVIL.COM', 'www.evil', 'win.example.nl', 'go to bit.ly', 'ann@evil', 'a\nb', 'x'.repeat(51), '  ']) {
  assert.ok(!accepts(name), `accepted: ${name}`);
}
console.log('names check ok');
