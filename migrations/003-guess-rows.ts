// Migration 003 (94): a guess becomes one row per guesser and giftee, and live votes go. The owner chose to start
// fresh: old guesses and votes are dropped, not converted. Dropping `guesses` takes its old unique index
// (edition, guesser) with it; the new one is created here so a running app can't write duplicates before it restarts.
import type { Db } from 'mongodb';
import type { MigrationReport } from './001-v1-to-v2';

export const id = '003-guess-rows';

export const up = async (db: Db, { apply }: { apply: boolean; now?: Date }): Promise<MigrationReport> => {
  // No filter: Atlas Flex only takes an exact name or a regex there ("can't get regex from filter doc").
  const found = (await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name).filter((name) => ['guesses', 'votes'].includes(name));
  const counts = Object.fromEntries(await Promise.all(found.map(async (name) => [name, await db.collection(name).countDocuments()])));
  const report: MigrationReport = { source: counts, planned: counts, conflicts: {}, invalid: [], samples: {} };
  if (!apply) return report;
  for (const name of found) await db.dropCollection(name);
  await db.collection('guesses').createIndex({ editionId: 1, guesserMemberId: 1, gifteeMemberId: 1 }, { unique: true });
  return { ...report, written: counts };
};
