import * as v from 'valibot';
import { Id, MultiLine } from './common';

export const TipFields = v.object({
  text: MultiLine(1000),
  /** Named by default; the author can post anonymously. */
  anonymous: v.optional(v.boolean(), false),
});
export type TipFields = v.InferOutput<typeof TipFields>;

/**
 * `tips` collection (42): a tip about a member for that member's Santa. Readable only by
 * the subject's current Santa and the author; never by the subject or the organizer.
 */
export const Tip = v.object({
  _id: Id,
  groupId: Id,
  aboutMemberId: Id,
  authorMemberId: Id,
  ...TipFields.entries,
  usedAt: v.optional(v.date()),
  createdAt: v.date(),
  updatedAt: v.date(),
});
export type Tip = v.InferOutput<typeof Tip>;
