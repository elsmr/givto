import * as v from 'valibot';
import { anonymousSendAt } from '../../anonymous-delay';
import { Id } from '../../schema/common';
import { isDrawn } from '../../schema/edition';
import { AnswerFields, QuestionFields, type Question } from '../../schema/question';
import { ownAndManagedIds, santaActionProcedure, santaViewProcedure } from '../between/santa-role';
import { newId } from '../db';
import { AppError } from '../errors';
import { enforceRateLimit } from '../rate-limit';
import { editionProcedure, router } from '../trpc';

const DAY = 24 * 60 * 60;

const toAnswerView = (question: Question) =>
  question.answer ? { text: question.answer.text, answeredAt: question.answer.answeredAt } : null;

/**
 * Anonymous Q&A (52): a Santa asks their giftee, the giftee answers without learning who
 * asked. The giftee's outputs never carry `askerMemberId` or the real ask time (`askedAt`
 * is the delivery slot); questions show up for the giftee only from `notifyAfter` on. There
 * is no organizer path. Threads where the caller would answer their own question (they
 * manage the giftee) are left out.
 */
export const questionRouter = router({
  /** The caller's questions to their giftee with answers. Null when not a Santa here. */
  asked: santaViewProcedure.query(async ({ ctx }) => {
    if (!ctx.santaRole) return null;
    const { santa, giftee, answersOwnQuestions } = ctx.santaRole;
    const questions = await ctx.db.questions
      .find({ editionId: ctx.edition._id, askerMemberId: santa.id, gifteeMemberId: giftee.id })
      .sort({ createdAt: 1 })
      .toArray();
    return {
      giftee: { name: giftee.name },
      canAsk: isDrawn(ctx.edition) && !answersOwnQuestions,
      answersOwnQuestions,
      questions: questions.map((q) => ({ id: q._id, text: q.text, askedAt: q.createdAt, answer: toAnswerView(q) })),
    };
  }),

  ask: santaActionProcedure.input(QuestionFields).mutation(async ({ ctx, input }) => {
    if (!isDrawn(ctx.edition)) throw new AppError('EDITION_CLOSED');
    if (ctx.answersOwnQuestions) throw new AppError('FORBIDDEN');
    await enforceRateLimit(`question:ask:${ctx.edition._id}:${ctx.santa.id}`, { window: DAY, max: 3 });
    const now = new Date();
    const question: Question = {
      _id: newId(),
      editionId: ctx.edition._id,
      gifteeMemberId: ctx.giftee.id,
      askerMemberId: ctx.santa.id,
      text: input.text,
      notifyAfter: anonymousSendAt(now, ctx.group.timeZone),
      createdAt: now,
    };
    await ctx.db.questions.insertOne(question);
    return { id: question._id, text: question.text, askedAt: now, answer: null };
  }),

  /** Questions for the caller and the members they manage, once delivered. No asker identity. */
  forMe: editionProcedure.query(async ({ ctx }) => {
    const ownIds = ownAndManagedIds(ctx.group, ctx.member);
    const questions = await ctx.db.questions
      .find({
        editionId: ctx.edition._id,
        gifteeMemberId: { $in: ownIds },
        askerMemberId: { $nin: ownIds },
        notifyAfter: { $lte: new Date() },
      })
      .sort({ notifyAfter: 1, _id: 1 })
      .toArray();
    const nameOf = (memberId: string) => ctx.group.members.find((m) => m.id === memberId)?.name ?? '';
    return questions.map((q) => ({
      id: q._id,
      text: q.text,
      forName: q.gifteeMemberId === ctx.member.id ? null : nameOf(q.gifteeMemberId),
      askedAt: q.notifyAfter,
      answer: toAnswerView(q),
    }));
  }),

  /** Answered once; the answer reaches the Santa right away (nothing anonymous about the giftee). */
  answer: editionProcedure
    .input(v.object({ questionId: Id, ...AnswerFields.entries }))
    .mutation(async ({ ctx, input }) => {
      if (!isDrawn(ctx.edition)) throw new AppError('EDITION_CLOSED');
      const ownIds = ownAndManagedIds(ctx.group, ctx.member);
      const now = new Date();
      const answer = { text: input.text, answeredAt: now, notifyAfter: now };
      const { matchedCount } = await ctx.db.questions.updateOne(
        {
          _id: input.questionId,
          editionId: ctx.edition._id,
          gifteeMemberId: { $in: ownIds },
          askerMemberId: { $nin: ownIds },
          notifyAfter: { $lte: now },
          answer: { $exists: false },
        },
        { $set: { answer } }
      );
      if (matchedCount === 0) throw new AppError('NOT_FOUND');
      return { questionId: input.questionId, answer: { text: answer.text, answeredAt: now } };
    }),
});
