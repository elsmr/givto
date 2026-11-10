// pnpm migrate [--dry-run | --apply [--i-have-a-backup]]
// MONGODB_URI and MONGODB_DB come from the environment only (no .env file). Runbook: ticket 58.
import { MongoClient } from 'mongodb';
import { runMigrations, type MigrationResult } from './runner';

const USAGE = 'Usage: MONGODB_URI=… MONGODB_DB=… pnpm migrate [--dry-run (default) | --apply [--i-have-a-backup]]';
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const uri = process.env.MONGODB_URI ?? '';
const dbName = process.env.MONGODB_DB ?? '';

if (args.some((arg) => !['--dry-run', '--apply', '--i-have-a-backup'].includes(arg)) || (apply && args.includes('--dry-run')) || !uri || !dbName) {
  console.error(USAGE);
  process.exit(1);
}

/** Host names without credentials or ports, e.g. `mongodb://u:p@a:1,b:2/x` → [a, b]. */
const hosts = uri
  .replace(/^mongodb(\+srv)?:\/\//, '')
  .split(/[/?]/)[0]
  .split('@')
  .at(-1)!
  .split(',')
  .map((host) => host.replace(/:\d+$/, ''));
const local = uri.startsWith('mongodb://') && hosts.every((host) => ['localhost', '127.0.0.1', '[::1]'].includes(host));

console.log(`Target: ${hosts.join(', ')} / ${dbName} — ${apply ? 'APPLY (writes)' : 'dry run (reads only)'}`);
if (apply && !local && !args.includes('--i-have-a-backup')) {
  console.error('Refusing to write to a non-local database without --i-have-a-backup: take and check a backup first (runbook, ticket 58).');
  process.exit(1);
}

const json = (value: unknown) => JSON.stringify(value);

const print = ({ id, status, report }: MigrationResult) => {
  console.log(`\n${id}: ${status}`);
  if (!report) return;
  const counts = (record: Record<string, number>) => Object.entries(record).map(([key, n]) => `${key} ${n}`).join(', ');
  if (report.renames?.length) console.log(`  renames: ${report.renames.join(', ')}`);
  console.log(`  source: ${counts(report.source)}`);
  console.log(`  planned: ${counts(report.planned)}`);
  if (report.written) console.log(`  written: ${counts(report.written)}`);
  if (report.verified) {
    const checks = Object.entries(report.verified).map(([key, { planned, found }]) => `${key} ${found}/${planned} ${found === planned ? 'ok' : 'MISSING'}`);
    console.log(`  verified: ${checks.join(', ')}`);
  }
  const conflicts = Object.entries(report.conflicts);
  console.log(`  conflicts: ${conflicts.length === 0 ? 'none' : ''}`);
  for (const [kind, { count, samples }] of conflicts) {
    console.log(`    ${kind} ×${count}`);
    for (const sample of samples) console.log(`      ${json(sample)}`);
  }
  console.log(`  invalid documents: ${report.invalid.length}`);
  for (const doc of report.invalid.slice(0, 20)) console.log(`    ${json(doc)}`);
  console.log('  samples:');
  for (const [kind, sample] of Object.entries(report.samples)) console.log(`    ${kind}: ${JSON.stringify(sample, null, 2).replaceAll('\n', '\n    ')}`);
};

const failed = (result: MigrationResult) =>
  Boolean(result.report && (result.report.invalid.length > 0 || Object.values(result.report.verified ?? {}).some((v) => v.found !== v.planned)));

const client = await new MongoClient(uri).connect();
try {
  const results = await runMigrations(client.db(dbName), { apply });
  results.forEach(print);
  process.exitCode = results.some(failed) ? 1 : 0;
} catch (error) {
  console.error(`\nStopped: ${(error as Error).message}`);
  process.exitCode = 1;
} finally {
  await client.close();
}
