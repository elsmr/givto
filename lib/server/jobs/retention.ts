import { ObjectId } from 'mongodb';
import { todayIn } from '../../local-date';
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


/** Postal addresses go right after gift day (28, 55): once gift day is over in the edition's time zone. */
const deleteAddresses = async (db: Collections, now: Date) => {
  const editions = await db.editions
    .find({ 'participants.address': { $exists: true }, 'giftDay.date': { $lte: isoDate(now) } }, { projection: { giftDay: 1, timeZone: 1 } })
    .toArray();
  const past = editions.filter((edition) => edition.giftDay && edition.giftDay.date < todayIn(edition.timeZone, now));
  for (const edition of past) {
    await db.editions.updateOne({ _id: edition._id }, { $unset: { 'participants.$[].address': true } });
  }
  return past.length;
};

/** Claims, gifts marked (63), guesses (62), tips, questions, Psst!s and digests: `editionMessagesMonths` after gift day. */
const deleteEditionMessages = async (db: Collections, now: Date) => {
  const cutoff = isoDate(monthsBefore(now, retention.editionMessagesMonths));
  const ids = (await db.editions.find({ 'giftDay.date': { $lt: cutoff } }, { projection: { _id: 1 } }).toArray()).map((e) => e._id);
  const inEditions = { editionId: { $in: ids } };
  const results = await Promise.all([
    db.claims.deleteMany(inEditions),
    db.gifts.deleteMany(inEditions),
    db.guesses.deleteMany(inEditions),
    db.tips.deleteMany(inEditions),
    db.questions.deleteMany(inEditions),
    db.nudges.deleteMany(inEditions),
    db.wishlistNotifications.deleteMany(inEditions),
  ]);
  return results.reduce((sum, result) => sum + result.deletedCount, 0);
};

/**
 * A past draw stays until the group's next edition is drawn (to avoid repeats), at most `drawMaxMonths`.
 * Editions without a gift day (all migrated ones, 58) have no "past", so their draws are capped by age only.
 */
const deleteOldDraws = async (db: Collections, now: Date) => {
  const tooOld = monthsBefore(now, retention.drawMaxMonths);
  const editions = await db.editions
    .find(
      {
        draw: { $exists: true },
        $or: [{ 'giftDay.date': { $lt: isoDate(now) } }, { giftDay: { $exists: false }, 'draw.drawnAt': { $lte: tooOld } }],
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
  addresses: await deleteAddresses(db, now),
  editionMessages: await deleteEditionMessages(db, now),
  draws: await deleteOldDraws(db, now),
  orphanImages: await deleteOrphanImages(now),
  suppressions: await deleteUnusedSuppressions(db, now),
  ...(await cleanUpInactiveGroups(db, now)),
});
