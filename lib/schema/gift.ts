import * as v from 'valibot';
import { Id, SingleLine } from './common';

export const MAX_GIFT_WISHES = 50;
export const MAX_GIFT_LINES = 10;

/** What a Santa says they got (63): wishes from the giftee's list, and things that aren't on it. */
export const GiftFields = v.object({
  wishIds: v.pipe(v.array(Id), v.maxLength(MAX_GIFT_WISHES)),
  /** Short free text, e.g. "a scarf". */
  lines: v.pipe(v.array(SingleLine(100)), v.maxLength(MAX_GIFT_LINES)),
});
export type GiftFields = v.InferOutput<typeof GiftFields>;

/**
 * `gifts` collection: "I've got my gift" (63), one per Santa per edition, only while at least one
 * wish or line is marked. Private to the Santa: never returned to the giftee or the organizer;
 * the organizer only learns who is still shopping, the giftee only a count from gift day on.
 * Counts only while `gifteeMemberId` is still the Santa's giftee.
 */
export const Gift = v.object({
  _id: Id,
  editionId: Id,
  santaMemberId: Id,
  gifteeMemberId: Id,
  ...GiftFields.entries,
  createdAt: v.date(),
  updatedAt: v.date(),
});
export type Gift = v.InferOutput<typeof Gift>;
