// Runs the migrations not yet recorded in the `migrations` collection, in order (58).
import type { Db } from 'mongodb';
import * as v1ToV2 from './001-v1-to-v2';
import * as shownWishIds from './002-shown-wish-ids';

const migrations = [v1ToV2, shownWishIds];

export type MigrationResult = { id: string; status: 'applied before' | 'dry run' | 'applied'; report?: Awaited<ReturnType<typeof v1ToV2.up>> };

export const runMigrations = async (db: Db, { apply, now }: { apply: boolean; now?: Date }): Promise<MigrationResult[]> => {
  const log = db.collection<{ _id: string; appliedAt: Date; written?: Record<string, number> }>('migrations');
  const applied = new Set((await log.find({}, { projection: { _id: 1 } }).toArray()).map((doc) => doc._id));
  const results: MigrationResult[] = [];
  for (const migration of migrations) {
    if (applied.has(migration.id)) {
      results.push({ id: migration.id, status: 'applied before' });
      continue;
    }
    const report = await migration.up(db, { apply, now });
    if (apply) await log.insertOne({ _id: migration.id, appliedAt: new Date(), ...(report.written && { written: report.written }) });
    results.push({ id: migration.id, status: apply ? 'applied' : 'dry run', report });
  }
  return results;
};
