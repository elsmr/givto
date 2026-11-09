import * as v from 'valibot';
import { Id } from '../../schema/common';
import type { Edition } from '../../schema/edition';
import { newId } from '../db';
import { AppError } from '../errors';
import { markGifteeWishlistSeen } from '../jobs/wishlist-changes';
import { editionProcedure, router, santaOfProcedure } from '../trpc';
import { toWishView, visibleWishes } from '../wishlist/wish-view';

/** Dibs! can be called and dropped from the draw until gift day is over. */
const claimsOpen = (edition: Edition) => edition.status === 'drawn' || edition.status === 'giftday';

const WishInput = v.object({ wishId: Id });

/**
 * "Dibs!" (38). Only the giftee's Santa in an edition sees and changes claims; other Santas
 * of the same person (other editions, other groups) only see "taken". The giftee never
 * reaches these procedures for their own wishes: they're keyed to the caller's giftee.
 */
export const claimRouter = router({
  /** The caller's giftee's wishlist in this edition with claim states, or null before the draw / outside it. */
  gifteeWishlist: editionProcedure.query(async ({ ctx }) => {
    const gifteeId = ctx.edition.draw?.assignments[ctx.member.id];
    const giftee = ctx.group.members.find((member) => member.id === gifteeId);
    if (!giftee) return null;
    await markGifteeWishlistSeen(ctx.db, ctx.edition._id, ctx.member.id);
    const wishes = await visibleWishes(ctx.db, giftee);
    const claims = await ctx.db.claims.find({ wishId: { $in: wishes.map((wish) => wish._id) } }).toArray();
    const claimByWish = new Map(claims.map((claim) => [claim.wishId, claim]));
    const claimState = (wishId: string): 'mine' | 'taken' | null => {
      const claim = claimByWish.get(wishId);
      if (!claim) return null;
      return claim.editionId === ctx.edition._id && claim.santaMemberId === ctx.member.id ? 'mine' : 'taken';
    };
    return {
      giftee: { name: giftee.name },
      budget: ctx.edition.budget,
      canClaim: claimsOpen(ctx.edition),
      wishes: wishes.map((wish) => ({ ...toWishView(wish), claim: claimState(wish._id) })),
    };
  }),

  add: santaOfProcedure.input(WishInput).mutation(async ({ ctx, input }) => {
    if (!claimsOpen(ctx.edition)) throw new AppError('FORBIDDEN');
    const wish = (await visibleWishes(ctx.db, ctx.giftee)).find((w) => w._id === input.wishId);
    if (!wish) throw new AppError('NOT_FOUND');
    try {
      await ctx.db.claims.insertOne({
        _id: newId(),
        wishId: wish._id,
        ownerId: wish.ownerId,
        editionId: ctx.edition._id,
        santaMemberId: ctx.santa.id,
        createdAt: new Date(),
      });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) throw new AppError('WISH_TAKEN');
      throw error;
    }
    return { wishId: wish._id, claim: 'mine' as const };
  }),

  remove: santaOfProcedure.input(WishInput).mutation(async ({ ctx, input }) => {
    if (!claimsOpen(ctx.edition)) throw new AppError('FORBIDDEN');
    const { deletedCount } = await ctx.db.claims.deleteOne({
      wishId: input.wishId,
      editionId: ctx.edition._id,
      santaMemberId: ctx.santa.id,
    });
    if (deletedCount === 0) throw new AppError('NOT_FOUND');
    return { wishId: input.wishId, claim: null };
  }),
});
