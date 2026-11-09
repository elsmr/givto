import type { EmailSuppression } from '../../schema/notification';
import type { Collections } from '../db';

/** Hard bounces and spam complaints (54): notifications skip these addresses. */
export const suppressEmail = (db: Collections, email: string, reason: EmailSuppression['reason']) =>
  db.emailSuppressions.updateOne(
    { _id: email.trim().toLowerCase() },
    { $set: { reason, at: new Date() } },
    { upsert: true }
  );

export const isSuppressed = async (db: Collections, email: string): Promise<boolean> =>
  (await db.emailSuppressions.countDocuments({ _id: email.toLowerCase() }, { limit: 1 })) > 0;

/** Which of these addresses bounced: for the organizer's people list ("this address bounced"). */
export const suppressedEmails = async (db: Collections, emails: string[]): Promise<Set<string>> =>
  new Set((await db.emailSuppressions.find({ _id: { $in: emails } }, { projection: { _id: 1 } }).toArray()).map((s) => s._id));
