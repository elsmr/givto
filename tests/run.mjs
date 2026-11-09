// Runs a suite of test files in sequence, each in its own node process with ts-hooks (so files can
// import the app's TypeScript). Every file runs; the exit code is 1 if any failed.
//   node tests/run.mjs check   every tests/*.check.mjs (pnpm test)
//   node tests/run.mjs smoke   tests/smoke.mjs + every tests/smoke-<slice>.mjs against one running
//                              app; tests/env.sh prints the env vars (pnpm test:smoke)
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';

const suites = {
  check: (file) => file.endsWith('.check.mjs'),
  smoke: (file) => /^smoke(-[a-z]+\d+)?\.mjs$/.test(file),
};
const suite = suites[process.argv[2]];
if (!suite) {
  console.error(`usage: node tests/run.mjs ${Object.keys(suites).join('|')}`);
  process.exit(2);
}

// smoke-s7 asserts job counts across the whole database, so it runs first, on the fresh one tests/env.sh starts.
const runsFirst = (file) => (file === 'smoke-s7.mjs' ? 0 : 1);
const testsDir = new URL('.', import.meta.url);
const files = readdirSync(testsDir)
  .filter(suite)
  .sort((a, b) => runsFirst(a) - runsFirst(b) || a.localeCompare(b));
const failed = files.filter((file) => {
  console.log(`\n▶ tests/${file}`);
  const { status } = spawnSync(process.execPath, ['--import', './tests/ts-hooks.mjs', `tests/${file}`], {
    stdio: 'inherit',
  });
  return status !== 0;
});

console.log(`\n${files.length - failed.length}/${files.length} passed${failed.length ? `; failed: ${failed.join(', ')}` : ''}`);
process.exit(failed.length ? 1 : 0);
