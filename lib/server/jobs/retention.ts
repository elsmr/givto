import { ObjectId } from 'mongodb';
import { retention } from '../../privacy';
import type { Collections } from '../db';
import { getMongoDb } from '../db';
import { deleteWishImage } from '../import/wish-images';
import { deleteUnusedSuppressions } from '../mail/suppression';
import { isoDate, monthsBefore } from './dates';
import { cleanUpInactiveGroups } from './inactive-groups';

const HOUR = 60 * 60 * 1000;
/** Imported images that never made it onto a wish (29 Findings). */
const ORPHAN_IMAGE_HOURS = 24;


/**
 * Editions without a gift day (58: migrated; or never set) that ended before `before`: marked done, or
 * the group's next edition started. The group's latest edition doesn't end this way: it goes with the
 * group once that's inactive (`inactiveGroupMonths`).
 */
const endedWithoutGiftDay = async (db: Collections, before: Date) => {
  const editions = await db.editions
    .aggregate<{ _id: string }>([
      { $match: { giftDay: { $exists: false } } },
      {
        $lookup: {
          from: 'editions',
          localField: 'groupId',
          foreignField: 'groupId',
          let: { number: '$number' },
          pipeline: [{ $match: { $expr: { $gt: ['$number', '$$number'] }, createdAt: { $lt: before } } }, { $limit: 1 }, { $project: { _id: 1 } }],
          as: 'next',
        },
      },
      { $match: { $or: [{ 'statusChangedAt.done': { $lt: before } }, { 'next.0': { $exists: true } }] } },
      { $project: { _id: 1 } },
    ])
    .toArray();
  return editions.map((edition) => edition._id);
};

/** Claims, gifts marked (63), guesses (62), votes (83), tips, questions, Psst!s and digests: `editionMessagesMonths` after gift day (or the end, without one). */
const deleteEditionMessages = async (db: Collections, now: Date) => {
  const cutoff = monthsBefore(now, retention.editionMessagesMonths);
  const pastGiftDay = await db.editions.find({ 'giftDay.date': { $lt: isoDate(cutoff) } }, { projection: { _id: 1 } }).toArray();
  const ids = [...pastGiftDay.map((e) => e._id), ...(await endedWithoutGiftDay(db, cutoff))];
  const inEditions = { editionId: { $in: ids } };
  const results = await Promise.all([
    db.claims.deleteMany(inEditions),
    db.gifts.deleteMany(inEditions),
    db.guesses.deleteMany(inEditions),
    db.votes.deleteMany(inEditions),
    db.tips.deleteMany(inEditions),
    db.questions.deleteMany(inEditions),
    db.nudges.deleteMany(inEditions),
    db.wishlistNotifications.deleteMany(inEditions),
  ]);
  return results.reduce((sum, result) => sum + result.deletedCount, 0);
};

/**
 * A past draw stays until the group's next edition is drawn (to avoid repeats), at most `drawMaxMonths`.
 * Without a gift day, any draw qualifies: the live edition's draw is never replaced, so only the age cap applies to it.
 */
const deleteOldDraws = async (db: Collections, now: Date) => {
  const tooOld = monthsBefore(now, retention.drawMaxMonths);
  const editions = await db.editions
    .find(
      {
        draw: { $exists: true },
        $or: [{ 'giftDay.date': { $lt: isoDate(now) } }, { giftDay: { $exists: false } }],
      },
      { projection: { groupId: 1, number: 1, 'draw.drawnAt': 1 } }
    )
    .toArray();
  let deleted = 0;
  for (const edition of editions) {
    const replaced = await db.editions.countDocuments(
      { groupId: edition.groupId, number: { $gt: edition.number }, draw: { $exists: true } },
      { limit: 1 }
    );
    if (replaced === 0 && edition.draw!.drawnAt > tooOld) continue;
    await db.editions.updateOne({ _id: edition._id }, { $unset: { draw: true } });
    deleted++;
  }
  return deleted;
};

const deleteOrphanImages = async (now: Date) => {
  const orphans = await getMongoDb()
    .collection<{ _id: ObjectId }>('wishImages.files')
    .aggregate<{ _id: ObjectId }>([
      { $match: { uploadDate: { $lt: new Date(now.getTime() - ORPHAN_IMAGE_HOURS * HOUR) } } },
      {
        $lookup: {
          from: 'wishes',
          let: { id: { $toString: '$_id' } },
          pipeline: [{ $match: { $expr: { $in: ['$$id', { $ifNull: ['$links.imageId', []] }] } } }, { $limit: 1 }],
          as: 'wishes',
        },
      },
      { $match: { wishes: { $size: 0 } } },
      { $limit: 500 },
      { $project: { _id: 1 } },
    ])
    .toArray();
  for (const file of orphans) await deleteWishImage(file._id.toHexString());
  return orphans.length;
};

/** Retention (55), with the periods from lib/privacy.ts that /privacy shows. Daily. */
export const runRetention = async (db: Collections, now: Date) => ({
  editionMessages: await deleteEditionMessages(db, now),
  draws: await deleteOldDraws(db, now),
  orphanImages: await deleteOrphanImages(now),
  suppressions: await deleteUnusedSuppressions(db, now),
  ...(await cleanUpInactiveGroups(db, now)),
});
