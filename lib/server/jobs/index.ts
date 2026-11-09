import type { Collections } from '../db';
import { runDeliveries } from './deliveries';
import { runRetention } from './retention';
import { sendReminders } from './reminders';
import { sendWishlistDigests } from './wishlist-digests';

/**
 * Scheduled jobs (29), run by pages/api/cron/[job].ts. Each is idempotent and safe to run
 * every few minutes; vercel.json sets how often they actually run.
 */
export const jobs: Record<string, (db: Collections, now: Date) => Promise<object>> = {
  deliveries: runDeliveries,
  digests: sendWishlistDigests,
  reminders: sendReminders,
  retention: runRetention,
  // S4 merge (coordinator): add `draws: () => runDueDraws()` from './draws' here and to vercel.json.
};
