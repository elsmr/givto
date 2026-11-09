import * as v from 'valibot';
import { Id } from '../../schema/common';
import { AppError } from '../errors';
import { addToCurrentEdition } from '../membership';
import { removeMember } from '../remove-member';
import { notifyJoined } from '../mail/join-notices';
import { memberProcedure, organizerProcedure, router } from '../trpc';

const MemberInput = v.object({ memberId: Id });

export const membershipRouter = router({
  /** Leave the group (48), before or after the draw: the draw is patched so everyone left keeps a giftee. */
  leave: memberProcedure.mutation(async ({ ctx }) => {
    if (ctx.member.role === 'organizer') throw new AppError('ORGANIZER_CANNOT_LEAVE');
    await removeMember(ctx.db, ctx.group, ctx.member.id);
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
    await addToCurrentEdition(ctx.db, ctx.group._id, input.memberId);
    await notifyJoined(ctx.db, ctx.group._id, input.memberId);
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
