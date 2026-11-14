import * as v from 'valibot';
import { Id } from '../../schema/common';
import type { Edition } from '../../schema/edition';
import type { Group } from '../../schema/group';
import type { Member } from '../../schema/member';
import { BoardPostFields, TipFields, type Tip } from '../../schema/tip';
import { boardPeople } from '../between/boards';
import { newId } from '../db';
import { AppError } from '../errors';
import { enforceRateLimit } from '../rate-limit';
import { editionProcedure, router } from '../trpc';
import { toWishView, visibleWishes } from '../wishlist/wish-view';

const PostInput = v.object({ postId: Id });

const writable = (edition: Edition) => ['open', 'drawn', 'giftday'].includes(edition.status);

const boardOf = (group: Group, edition: Edition, caller: Member, aboutMemberId: string) => {
  const person = boardPeople(group, edition, caller).find((m) => m.id === aboutMemberId);
  if (!person) throw new AppError('NOT_FOUND');
  return person;
};

const writeLimit = (memberId: string) => enforceRateLimit(`board:write:${memberId}`, { window: 60 * 60, max: 30 });

const toPost = (post: Tip, group: Group, caller: Member) => ({
  id: post._id,
  text: post.text,
  anonymous: post.anonymous,
  mine: post.authorMemberId === caller.id,
  author: post.anonymous ? null : { name: group.members.find((m) => m.id === post.authorMemberId)?.name ?? '' },
  updatedAt: post.updatedAt,
});

/**
 * Conspiracy boards (90): one per person in the edition, where everyone else plans one gift for them. Posts live in
 * `tips` with `board: true`. Every read and write goes through `boardPeople`, so nobody reaches their own board.
 */
export const boardRouter = router({
  /** Everyone's board but mine, with their wishlist (read-only), or null when I have no boards here. */
  list: editionProcedure.query(async ({ ctx }) => {
    const people = boardPeople(ctx.group, ctx.edition, ctx.member);
    if (people.length === 0) return null;
    const posts = await ctx.db.tips
      .find({ editionId: ctx.edition._id, board: true, aboutMemberId: { $in: people.map((m) => m.id) } })
      .sort({ createdAt: 1 })
      .toArray();
    const boards = await Promise.all(
      people.map(async (person) => ({
        memberId: person.id,
        name: person.name,
        posts: posts.filter((post) => post.aboutMemberId === person.id).map((post) => toPost(post, ctx.group, ctx.member)),
        wishes: (await visibleWishes(ctx.db, person)).map(toWishView),
      }))
    );
    return { canWrite: writable(ctx.edition), budget: ctx.edition.budget, boards };
  }),

  create: editionProcedure.input(v.object({ aboutMemberId: Id, ...BoardPostFields.entries })).mutation(async ({ ctx, input }) => {
    if (!writable(ctx.edition)) throw new AppError('EDITION_CLOSED');
    const person = boardOf(ctx.group, ctx.edition, ctx.member, input.aboutMemberId);
    await writeLimit(ctx.member.id);
    const now = new Date();
    const post: Tip = {
      _id: newId(),
      editionId: ctx.edition._id,
      aboutMemberId: person.id,
      authorMemberId: ctx.member.id,
      text: input.text,
      anonymous: input.anonymous,
      board: true,
      createdAt: now,
      updatedAt: now,
    };
    await ctx.db.tips.insertOne(post);
    return toPost(post, ctx.group, ctx.member);
  }),

  /** Without `anonymous` the post keeps its own setting. */
  update: editionProcedure
    .input(v.object({ ...PostInput.entries, text: TipFields.entries.text, anonymous: v.optional(v.boolean()) }))
    .mutation(async ({ ctx, input }) => {
      if (!writable(ctx.edition)) throw new AppError('EDITION_CLOSED');
      const post = await ctx.db.tips.findOne({ _id: input.postId, editionId: ctx.edition._id, authorMemberId: ctx.member.id, board: true });
      if (!post) throw new AppError('NOT_FOUND');
      boardOf(ctx.group, ctx.edition, ctx.member, post.aboutMemberId);
      await writeLimit(ctx.member.id);
      const changes = { text: input.text, anonymous: input.anonymous ?? post.anonymous, updatedAt: new Date() };
      await ctx.db.tips.updateOne({ _id: post._id }, { $set: changes });
      return toPost({ ...post, ...changes }, ctx.group, ctx.member);
    }),

  delete: editionProcedure.input(PostInput).mutation(async ({ ctx, input }) => {
    if (!writable(ctx.edition)) throw new AppError('EDITION_CLOSED');
    const { deletedCount } = await ctx.db.tips.deleteOne({ _id: input.postId, editionId: ctx.edition._id, authorMemberId: ctx.member.id, board: true });
    if (deletedCount === 0) throw new AppError('NOT_FOUND');
    return { postId: input.postId };
  }),
});
