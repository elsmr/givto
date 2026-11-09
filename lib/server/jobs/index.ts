import type { Collections } from '../db';
import { log } from '../log';
import { runDeliveries } from './deliveries';
import { runDueDraws } from './draws';
import { runRetention } from './retention';
import { sendReminders } from './reminders';
import { sendWishlistDigests } from './wishlist-digests';

type Job = (db: Collections, now: Date) => Promise<object>;

const frequent: Record<string, Job> = {
  draws: (_db, now) => runDueDraws(now),
  deliveries: runDeliveries,
  digests: sendWishlistDigests,
  reminders: sendReminders,
};

// One scheduled call for all frequent jobs: free schedulers cap the number of runs (59).
// Draws first, so their notices go out in the same tick. A failing job doesn't stop the rest.
const tick: Job = async (db, now) => {
  const results: Record<string, unknown> = {};
  for (const [name, job] of Object.entries(frequent)) {
    try {
      results[name] = await job(db, now);
    } catch (error) {
      log.error({ err: error, job: name }, 'tick job failed');
      results[name] = { failed: true };
    }
  }
  return results;
};

/**
 * Scheduled jobs (29), run by pages/api/cron/[job].ts. Each is idempotent and safe to run
 * every few minutes. Schedulers call `tick` (frequent jobs) and `retention` (daily).
 */
export const jobs: Record<string, Job> = { ...frequent, tick, retention: runRetention };
