import * as v from 'valibot';
import { Id, MultiLine } from './common';

export const QuestionFields = v.object({ text: MultiLine(500) });
export const AnswerFields = v.object({ text: MultiLine(1000) });

/**
 * Anonymous Q&A (52) and nudge-style emails send at `notifyAfter` (debounced, fixed time
 * of day), not when the action happens, so timing doesn't reveal the Santa.
 */
const Delivery = {
  notifyAfter: v.optional(v.date()),
  notifiedAt: v.optional(v.date()),
};

/**
 * `questions` collection: a Santa asks their giftee. `askerMemberId` is never returned to
 * the giftee; the organizer can't read threads.
 */
export const Question = v.object({
  _id: Id,
  editionId: Id,
  gifteeMemberId: Id,
  askerMemberId: Id,
  ...QuestionFields.entries,
  ...Delivery,
  answer: v.optional(v.object({ ...AnswerFields.entries, answeredAt: v.date(), ...Delivery })),
  createdAt: v.date(),
});
export type Question = v.InferOutput<typeof Question>;
