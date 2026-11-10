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

/**
 * Retention (55): drop records for addresses nothing refers to anymore. Emails live only on
 * accounts (`users.email`, stored lowercase by Better Auth) and email invites; members,
 * managed members included, have no email of their own.
 */
export const deleteUnusedSuppressions = async (db: Collections, now: Date): Promise<number> => {
  const emails = (await db.emailSuppressions.find({}, { projection: { _id: 1 } }).toArray()).map((s) => s._id);
  const [accounts, invited] = await Promise.all([
    db.users.distinct('email', { email: { $in: emails } }),
    db.invites.distinct('email', { email: { $in: emails }, usedAt: { $exists: false }, expiresAt: { $gt: now } }),
  ]);
  const used = new Set<string>([...accounts, ...invited]);
  const unused = emails.filter((email) => !used.has(email));
  if (unused.length === 0) return 0;
  return (await db.emailSuppressions.deleteMany({ _id: { $in: unused } })).deletedCount;
};
