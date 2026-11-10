import { isFromGiftDay, type Edition } from '../../schema/edition';
import type { Gift } from '../../schema/gift';
import type { GiftCounts } from '../../unwrap-turns';
import type { Collections } from '../db';

/** "I've got my gift" (63) per Santa member id, only the marks for the Santa's current giftee. */
export const currentGifts = async (db: Collections, edition: Edition): Promise<Map<string, Gift>> => {
  const assignments = edition.draw?.assignments ?? {};
  const gifts = await db.gifts.find({ editionId: edition._id }).toArray();
  return new Map(gifts.filter((gift) => assignments[gift.santaMemberId] === gift.gifteeMemberId).map((gift) => [gift.santaMemberId, gift]));
};

/** How many gifts each person gets, from what their Santa marked. Only from gift day on (63): empty before. */
export const giftCounts = async (db: Collections, edition: Edition): Promise<GiftCounts> => {
  if (!isFromGiftDay(edition)) return {};
  const counts: GiftCounts = {};
  for (const gift of (await currentGifts(db, edition)).values()) {
    counts[gift.gifteeMemberId] = (counts[gift.gifteeMemberId] ?? 0) + gift.wishIds.length + gift.lines.length;
  }
  return counts;
};

/** A dropped Dibs! isn't a bought gift either; the mark goes once nothing is left on it. */
export const dropGiftWish = async (db: Collections, editionId: string, santaMemberId: string, wishId: string) => {
  const filter = { editionId, santaMemberId };
  await db.gifts.updateOne(filter, { $pull: { wishIds: wishId }, $set: { updatedAt: new Date() } });
  await db.gifts.deleteOne({ ...filter, wishIds: { $size: 0 }, lines: { $size: 0 } });
};
