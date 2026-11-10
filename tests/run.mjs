// Runs every tests/*.check.mjs in sequence (pnpm test), each in its own node process with ts-hooks
// (so files can import the app's TypeScript). Every file runs; the exit code is 1 if any failed.
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';

const testsDir = new URL('.', import.meta.url);
const files = readdirSync(testsDir)
  .filter((file) => file.endsWith('.check.mjs'))
  .sort();
const failed = files.filter((file) => {
  console.log(`\n▶ tests/${file}`);
  const { status } = spawnSync(process.execPath, ['--import', './tests/ts-hooks.mjs', `tests/${file}`], {
    stdio: 'inherit',
  });
  return status !== 0;
});

console.log(`\n${files.length - failed.length}/${files.length} passed${failed.length ? `; failed: ${failed.join(', ')}` : ''}`);
process.exit(failed.length ? 1 : 0);
