import * as v from 'valibot';
import { Id } from '../../schema/common';
import { AppError } from '../errors';
import { addToOpenEdition, currentEdition } from '../membership';
import { memberProcedure, organizerProcedure, router } from '../trpc';

const MemberInput = v.object({ memberId: Id });

export const membershipRouter = router({
  /**
   * Leave the group (48). Before the draw you're simply taken out of the edition; after it,
   * changing the chain is the late-change policy (S4), so it's refused for now.
   */
  leave: memberProcedure.mutation(async ({ ctx }) => {
    if (ctx.member.role === 'organizer') throw new AppError('ORGANIZER_CANNOT_LEAVE');
    const edition = await currentEdition(ctx.db, ctx.group._id);
    if (edition?.status === 'drawn' || edition?.status === 'giftday') throw new AppError('ALREADY_DRAWN');
    const now = new Date();
    if (edition && edition.status !== 'done') {
      await ctx.db.editions.updateOne(
        { _id: edition._id },
        { $pull: { participants: { memberId: ctx.member.id } }, $set: { updatedAt: now } }
      );
    }
    const me = ctx.member.id;
    await ctx.db.groups.updateOne(
      { _id: ctx.group._id, 'members.id': me },
      {
        $set: {
          'members.$.status': 'removed',
          'members.$.removedAt': now,
          households: ctx.group.households
            .map((h) => ({ ...h, memberIds: h.memberIds.filter((id) => id !== me) }))
            .filter((h) => h.memberIds.length >= 2),
          exclusions: ctx.group.exclusions.filter((e) => e.from !== me && e.to !== me),
          updatedAt: now,
        },
      }
    );
    return { ok: true };
  }),

  /** Let in someone who asked to join via the link (45). */
  approve: organizerProcedure.input(MemberInput).mutation(async ({ ctx, input }) => {
    const now = new Date();
    const result = await ctx.db.groups.updateOne(
      { _id: ctx.group._id, members: { $elemMatch: { id: input.memberId, status: 'requested' } } },
      { $set: { 'members.$.status': 'joined', 'members.$.joinedAt': now, updatedAt: now } }
    );
    if (result.matchedCount === 0) throw new AppError('NOT_FOUND');
    await addToOpenEdition(ctx.db, ctx.group._id, input.memberId);
    return { ok: true };
  }),

  reject: organizerProcedure.input(MemberInput).mutation(async ({ ctx, input }) => {
    const now = new Date();
    const result = await ctx.db.groups.updateOne(
      { _id: ctx.group._id, members: { $elemMatch: { id: input.memberId, status: 'requested' } } },
      { $set: { 'members.$.status': 'removed', 'members.$.removedAt': now, updatedAt: now } }
    );
    if (result.matchedCount === 0) throw new AppError('NOT_FOUND');
    return { ok: true };
  }),
});
