import * as v from 'valibot';
import { Id } from '../../schema/common';
import type { Edition } from '../../schema/edition';
import type { Group } from '../../schema/group';
import type { Member } from '../../schema/member';
import { TipFields, type Tip } from '../../schema/tip';
import { santaActionProcedure, santaViewProcedure } from '../between/santa-role';
import { newId, type Collections } from '../db';
import { AppError } from '../errors';
import { enforceRateLimit } from '../rate-limit';
import { editionProcedure, router } from '../trpc';

const TipInput = v.object({ tipId: Id });

/** Tips can be written from the moment people join until gift day is over (before the draw too). */
const tipsOpen = (edition: Edition) => ['open', 'drawn', 'giftday'].includes(edition.status);

/** Everyone in this edition's draw except the caller: the people the caller can leave a tip about. */
const tippablePeople = (group: Group, edition: Edition, caller: Member) =>
  edition.participants
    .filter((p) => p.participates && p.status !== 'declined' && p.memberId !== caller.id)
    .map((p) => group.members.find((m) => m.id === p.memberId && m.status === 'joined'))
    .filter((m): m is Member => m !== undefined)
    .map((m) => ({ memberId: m.id, name: m.name }));

/** The author's view: no `usedAt` (no read receipts) and nothing about who the Santa is. */
const toAuthoredTip = (tip: Tip, group: Group) => ({
  id: tip._id,
  aboutMemberId: tip.aboutMemberId,
  aboutName: group.members.find((m) => m.id === tip.aboutMemberId)?.name ?? '',
  text: tip.text,
  anonymous: tip.anonymous,
  updatedAt: tip.updatedAt,
});

const findOwnTip = async (db: Collections, edition: Edition, author: Member, tipId: string) => {
  const tip = await db.tips.findOne({ _id: tipId, editionId: edition._id, authorMemberId: author.id });
  if (!tip) throw new AppError('NOT_FOUND');
  return tip;
};

const writeLimit = (memberId: string) => enforceRateLimit(`tip:write:${memberId}`, { window: 60 * 60, max: 30 });

/**
 * Tips (42): anyone leaves a tip about someone in the draw, for that person's Santa. Only
 * the subject's current Santa (`forGiftee`) and the author (`authored`) read a tip; there is
 * no procedure that returns tips about the caller, and none for the organizer.
 */
export const tipRouter = router({
  authored: editionProcedure.query(async ({ ctx }) => {
    const tips = await ctx.db.tips
      .find({ editionId: ctx.edition._id, authorMemberId: ctx.member.id })
      .sort({ createdAt: 1 })
      .toArray();
    return {
      canWrite: tipsOpen(ctx.edition),
      people: tippablePeople(ctx.group, ctx.edition, ctx.member),
      tips: tips.map((tip) => toAuthoredTip(tip, ctx.group)),
    };
  }),

  create: editionProcedure
    .input(v.object({ aboutMemberId: Id, ...TipFields.entries }))
    .mutation(async ({ ctx, input }) => {
      if (!tipsOpen(ctx.edition)) throw new AppError('EDITION_CLOSED');
      const people = tippablePeople(ctx.group, ctx.edition, ctx.member);
      if (!people.some((p) => p.memberId === input.aboutMemberId)) throw new AppError('NOT_FOUND');
      await writeLimit(ctx.member.id);
      const now = new Date();
      const tip: Tip = {
        _id: newId(),
        editionId: ctx.edition._id,
        aboutMemberId: input.aboutMemberId,
        authorMemberId: ctx.member.id,
        text: input.text,
        anonymous: input.anonymous,
        createdAt: now,
        updatedAt: now,
      };
      await ctx.db.tips.insertOne(tip);
      return toAuthoredTip(tip, ctx.group);
    }),

  update: editionProcedure.input(v.object({ ...TipInput.entries, ...TipFields.entries })).mutation(async ({ ctx, input }) => {
    if (!tipsOpen(ctx.edition)) throw new AppError('EDITION_CLOSED');
    const tip = await findOwnTip(ctx.db, ctx.edition, ctx.member, input.tipId);
    await writeLimit(ctx.member.id);
    const changes = { text: input.text, anonymous: input.anonymous, updatedAt: new Date() };
    await ctx.db.tips.updateOne({ _id: tip._id }, { $set: changes });
    return toAuthoredTip({ ...tip, ...changes }, ctx.group);
  }),

  delete: editionProcedure.input(TipInput).mutation(async ({ ctx, input }) => {
    const tip = await findOwnTip(ctx.db, ctx.edition, ctx.member, input.tipId);
    await ctx.db.tips.deleteOne({ _id: tip._id });
    return { tipId: tip._id };
  }),

  /** Tips about the caller's giftee, whenever they were written (before the draw too). Null when not a Santa here. */
  forGiftee: santaViewProcedure.query(async ({ ctx }) => {
    if (!ctx.santaRole) return null;
    const { giftee } = ctx.santaRole;
    const tips = await ctx.db.tips
      .find({ editionId: ctx.edition._id, aboutMemberId: giftee.id })
      .sort({ createdAt: 1 })
      .toArray();
    const authorName = (tip: Tip) => ctx.group.members.find((m) => m.id === tip.authorMemberId)?.name ?? '';
    return {
      giftee: { name: giftee.name },
      canMarkUsed: tipsOpen(ctx.edition),
      tips: tips.map((tip) => ({
        id: tip._id,
        text: tip.text,
        mine: tip.authorMemberId === ctx.member.id,
        author: tip.anonymous ? null : { name: authorName(tip) },
        used: tip.usedAt !== undefined,
      })),
    };
  }),

  setUsed: santaActionProcedure.input(v.object({ ...TipInput.entries, used: v.boolean() })).mutation(async ({ ctx, input }) => {
    if (!tipsOpen(ctx.edition)) throw new AppError('EDITION_CLOSED');
    const filter = { _id: input.tipId, editionId: ctx.edition._id, aboutMemberId: ctx.giftee.id };
    const result = input.used
      ? await ctx.db.tips.updateOne(filter, { $set: { usedAt: new Date() } })
      : await ctx.db.tips.updateOne(filter, { $unset: { usedAt: '' } });
    if (result.matchedCount === 0) throw new AppError('NOT_FOUND');
    return { tipId: input.tipId, used: input.used };
  }),
});
