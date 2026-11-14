import { drawEdition } from '../draw/run';
import { getDb } from '../db';
import { AppError } from '../errors';
import { log } from '../log';

/**
 * Scheduled draws (28): every open edition whose `drawAt` has passed. Safe to call on every
 * cron tick (S7). A draw that can't run (too few people, rules) drops its schedule, so the
 * organizer draws by hand instead of the job retrying every tick.
 * `editionIds` (tests only, see JobScope) limits it to those editions, so a test never draws another test's.
 */
export const runDueDraws = async (now = new Date(), editionIds?: string[]) => {
  const db = await getDb();
  const due = await db.editions.find({ status: 'open', drawAt: { $lte: now }, ...(editionIds && { _id: { $in: editionIds } }) }).toArray();
  const drawn: string[] = [];
  const failed: string[] = [];
  for (const edition of due) {
    const group = await db.groups.findOne({ _id: edition.groupId, deletedAt: { $exists: false } });
    try {
      if (!group) throw new AppError('GROUP_NOT_FOUND');
      await drawEdition(db, group, edition, now);
      drawn.push(edition._id);
    } catch (error) {
      if (!(error instanceof AppError)) throw error;
      failed.push(edition._id);
      log.warn({ editionId: edition._id, appCode: error.appCode }, 'scheduled draw failed');
      await db.editions.updateOne({ _id: edition._id, status: 'open' }, { $unset: { drawAt: true }, $set: { updatedAt: now } });
    }
  }
  if (due.length > 0) log.info({ drawn: drawn.length, failed: failed.length }, 'scheduled draws');
  return { drawn, failed };
};
