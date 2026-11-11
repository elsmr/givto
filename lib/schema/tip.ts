import * as v from 'valibot';
import { Id, MultiLine } from './common';

export const TipFields = v.object({
  text: MultiLine(1000),
  /** Anonymous by default (owner); the author can sign it with their name. */
  anonymous: v.optional(v.boolean(), true),
});
export type TipFields = v.InferOutput<typeof TipFields>;

/** A post on someone's board in a conspiracy (90): named by default (owner), anonymous on request. */
export const BoardPostFields = v.object({ text: TipFields.entries.text, anonymous: v.optional(v.boolean(), false) });

/**
 * `tips` collection (42): a tip about a participant for their Santa in that edition. Readable only by
 * the subject's current Santa and the author; never by the subject or the organizer.
 * `board` (90): a post on the subject's board in a conspiracy, read by everyone in that edition but the subject.
 * Tips and board posts never show up as each other, so switching the kind never widens who reads one.
 */
export const Tip = v.object({
  _id: Id,
  editionId: Id,
  aboutMemberId: Id,
  authorMemberId: Id,
  ...TipFields.entries,
  usedAt: v.optional(v.date()),
  board: v.optional(v.literal(true)),
  createdAt: v.date(),
  updatedAt: v.date(),
});
export type Tip = v.InferOutput<typeof Tip>;
