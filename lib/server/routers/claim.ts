import * as v from 'valibot';
import { Id } from '../../schema/common';
import { isDrawn } from '../../schema/edition';
import { isDuplicateKey, newId } from '../db';
import { santaAndGiftee } from '../draw/rules';
import { AppError } from '../errors';
import { dropGiftWish } from '../gift/marks';
import { editionProcedure, router, santaOfProcedure } from '../trpc';
import { santaWishes, savedWishView, toWishView, visibleWishes } from '../wishlist/wish-view';
import { markGifteeWishlistSeen } from '../wishlist/wishlist-changes';

const WishInput = v.object({ wishId: Id });

/**
 * "Dibs!" (38). Only the giftee's Santa in an edition sees and changes claims; other Santas
 * of the same person (other editions, other groups) only see "taken". The giftee never
 * reaches these procedures for their own wishes: they're keyed to the caller's giftee.
 */
export const claimRouter = router({
  /** The caller's giftee's wishlist in this edition with claim states, or null before the draw / outside it. */
  gifteeWishlist: editionProcedure.query(async ({ ctx }) => {
    const { giftee } = santaAndGiftee(ctx.group, ctx.edition, ctx.member);
    if (!giftee) return null;
    // A done edition shows the list as it was when it ended (100), never today's; nothing to claim any more.
    if (ctx.edition.status === 'done') {
      const saved = ctx.edition.wishlists?.find((list) => list.memberId === giftee.id)?.wishes ?? [];
      return {
        giftee: { name: giftee.name },
        budget: ctx.edition.budget,
        canClaim: false,
        saved: Boolean(ctx.edition.wishlists),
        wishes: saved.map((wish) => ({ ...savedWishView(wish), archived: false, claim: null })),
      };
    }
    await markGifteeWishlistSeen(ctx.db, ctx.edition._id, ctx.member.id);
    const wishes = await santaWishes(ctx.db, giftee, ctx.edition._id, ctx.member.id);
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
      canClaim: isDrawn(ctx.edition),
      saved: true,
      wishes: wishes.map((wish) => ({ ...toWishView(wish), archived: wish.archived, claim: claimState(wish._id) })),
    };
  }),

  add: santaOfProcedure.input(WishInput).mutation(async ({ ctx, input }) => {
    if (!isDrawn(ctx.edition)) throw new AppError('FORBIDDEN');
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
      if (isDuplicateKey(error)) throw new AppError('WISH_TAKEN');
      throw error;
    }
    return { wishId: wish._id, claim: 'mine' as const };
  }),

  remove: santaOfProcedure.input(WishInput).mutation(async ({ ctx, input }) => {
    if (!isDrawn(ctx.edition)) throw new AppError('FORBIDDEN');
    const { deletedCount } = await ctx.db.claims.deleteOne({
      wishId: input.wishId,
      editionId: ctx.edition._id,
      santaMemberId: ctx.santa.id,
    });
    if (deletedCount === 0) throw new AppError('NOT_FOUND');
    await dropGiftWish(ctx.db, ctx.edition._id, ctx.santa.id, input.wishId);
    return { wishId: input.wishId, claim: null };
  }),
});
