import * as v from 'valibot';
import { Id, MultiLine } from './common';

export const TipFields = v.object({
  text: MultiLine(1000),
  /** Anonymous by default (owner); the author can sign it with their name. */
  anonymous: v.optional(v.boolean(), true),
});
export type TipFields = v.InferOutput<typeof TipFields>;

/**
 * `tips` collection (42): a tip about a participant for their Santa in that edition. Readable only by
 * the subject's current Santa and the author; never by the subject or the organizer.
 */
export const Tip = v.object({
  _id: Id,
  editionId: Id,
  aboutMemberId: Id,
  authorMemberId: Id,
  ...TipFields.entries,
  usedAt: v.optional(v.date()),
  createdAt: v.date(),
  updatedAt: v.date(),
});
export type Tip = v.InferOutput<typeof Tip>;
