import type { Collections } from '../db';
import { deliverAnonymousMessages } from './anonymous-deliveries';
import { sendDrawNotices } from './draw-notices';
import { sendHandoverNotices } from './handover-notices';
import { addCounts, type JobCounts } from './run-each';

/** Everything that should go out soon after it happens; runs every few minutes. */
export const runDeliveries = async (db: Collections, now: Date) => {
  const drawn = await db.editions.find({ status: { $in: ['drawn', 'giftday'] }, draw: { $exists: true } }).toArray();
  const draws: JobCounts[] = [];
  for (const edition of drawn) draws.push(await sendDrawNotices(db, edition));
  return { draws: addCounts(...draws), handovers: await sendHandoverNotices(db, now), ...(await deliverAnonymousMessages(db, now)) };
};
