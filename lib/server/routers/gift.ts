import * as v from 'valibot';
import { isDrawn, isPosted, type Edition } from '../../schema/edition';
import { GiftFields } from '../../schema/gift';
import { santaActionProcedure } from '../between/santa-role';
import { isDuplicateKey, newId } from '../db';
import { AppError } from '../errors';
import { currentGifts, giftCounts } from '../gift/marks';
import { editionProcedure, organizerEditionProcedure, router } from '../trpc';
import { santaWishes } from '../wishlist/wish-view';

/** By post (87): posting and arrival change only from the draw until gift day is over, and never in person. */
const checkPostable = (edition: Edition) => {
  if (!isPosted(edition)) throw new AppError('FORBIDDEN');
  if (edition.status === 'done') throw new AppError('EDITION_CLOSED');
  if (!isDrawn(edition)) throw new AppError('NOT_DRAWN');
};

/** My current Santa's mark for me, by `gifteeMemberId`; whoever reads it must never get the Santa. */
const giftForMe = (edition: Edition, memberId: string) => {
  const santaId = Object.entries(edition.draw?.assignments ?? {}).find(([, gifteeId]) => gifteeId === memberId)?.[0];
  return santaId ? { editionId: edition._id, santaMemberId: santaId, gifteeMemberId: memberId } : null;
};

/**
 * "I've got my gift" (63): the Santa ticks wishes they bought and adds things that aren't on the
 * list. Only the Santa sees what; the organizer sees who is still shopping, the giftee a count
 * from gift day on.
 */
export const giftRouter = router({
  /**
   * My mark for my giftee. Before I marked anything, my Dibs! come pre-checked. By post (87): `post`, whether I
   * posted it and whether my giftee said it arrived.
   */
  mine: santaActionProcedure.query(async ({ ctx }) => {
    const { edition, santa, giftee } = ctx;
    const gift = await ctx.db.gifts.findOne({ editionId: edition._id, santaMemberId: santa.id, gifteeMemberId: giftee.id });
    const post = isPosted(edition) && { post: { posted: Boolean(gift?.postedAt), arrived: Boolean(gift?.arrivedAt) } };
    if (gift) return { marked: true, wishIds: gift.wishIds, lines: gift.lines, ...post };
    const wishIds = (await santaWishes(ctx.db, giftee, edition._id, santa.id)).map((wish) => wish._id);
    const claims = await ctx.db.claims.find({ editionId: edition._id, santaMemberId: santa.id, wishId: { $in: wishIds } }).toArray();
    return { marked: false, wishIds: claims.map((claim) => claim.wishId), lines: [] as string[], ...post };
  }),

  /** Saves what I got; ticking a free wish also calls Dibs! on it. Nothing ticked or written = not marked. */
  set: santaActionProcedure.input(GiftFields).mutation(async ({ ctx, input }) => {
    const { edition, santa, giftee } = ctx;
    if (edition.status === 'done') throw new AppError('EDITION_CLOSED');
    const wishIds = [...new Set(input.wishIds)];
    const filter = { editionId: edition._id, santaMemberId: santa.id };
    const [wishes, stored] = await Promise.all([santaWishes(ctx.db, giftee, edition._id, santa.id), ctx.db.gifts.findOne(filter)]);
    const visible = new Map(wishes.map((wish) => [wish._id, wish]));
    // A ticked wish the Santa no longer sees (deleted or hidden since) stays ticked: they still bought it.
    const kept = new Set(stored?.gifteeMemberId === giftee.id ? stored.wishIds : []);
    if (wishIds.some((id) => !visible.has(id) && !kept.has(id))) throw new AppError('NOT_FOUND');
    const claims = await ctx.db.claims.find({ wishId: { $in: wishIds } }).toArray();
    const mine = (claim: (typeof claims)[number]) => claim.editionId === edition._id && claim.santaMemberId === santa.id;
    if (claims.some((claim) => !mine(claim))) throw new AppError('WISH_TAKEN');
    const now = new Date();
    for (const wishId of wishIds.filter((id) => visible.has(id) && !claims.some((claim) => claim.wishId === id))) {
      try {
        await ctx.db.claims.insertOne({ _id: newId(), wishId, ownerId: visible.get(wishId)!.ownerId, editionId: edition._id, santaMemberId: santa.id, createdAt: now });
      } catch (error) {
        if (isDuplicateKey(error)) throw new AppError('WISH_TAKEN');
        throw error;
      }
    }
    if (wishIds.length + input.lines.length === 0) {
      await ctx.db.gifts.deleteOne(filter);
      return { marked: false, wishIds, lines: input.lines };
    }
    await ctx.db.gifts.updateOne(
      filter,
      {
        $set: { gifteeMemberId: giftee.id, wishIds, lines: input.lines, updatedAt: now },
        $setOnInsert: { _id: newId(), createdAt: now },
      },
      { upsert: true }
    );
    return { marked: true, wishIds, lines: input.lines };
  }),

  /** By post (87): on a marked gift only; un-posting also clears the giftee's "It arrived". */
  setPosted: santaActionProcedure.input(v.object({ posted: v.boolean() })).mutation(async ({ ctx, input }) => {
    const { edition, santa, giftee } = ctx;
    checkPostable(edition);
    const now = new Date();
    const saved = await ctx.db.gifts.updateOne(
      { editionId: edition._id, santaMemberId: santa.id, gifteeMemberId: giftee.id },
      input.posted ? { $set: { postedAt: now, updatedAt: now } } : { $set: { updatedAt: now }, $unset: { postedAt: true, arrivedAt: true } }
    );
    if (saved.matchedCount === 0) throw new AppError('NOT_FOUND');
    return { posted: input.posted };
  }),

  /** By post (87), the giftee's side: on its way once my Santa posted it, and whether I said it arrived. Never who. */
  arrival: editionProcedure.query(async ({ ctx }) => {
    const { edition } = ctx;
    const filter = isPosted(edition) && isDrawn(edition) && giftForMe(edition, ctx.member.id);
    if (!filter) return null;
    const gift = await ctx.db.gifts.findOne(filter, { projection: { postedAt: 1, arrivedAt: 1 } });
    return { posted: Boolean(gift?.postedAt), arrived: Boolean(gift?.arrivedAt) };
  }),

  /** By post (87): "It arrived", once my Santa marked it posted. */
  setArrived: editionProcedure.input(v.object({ arrived: v.boolean() })).mutation(async ({ ctx, input }) => {
    const { edition } = ctx;
    checkPostable(edition);
    const filter = giftForMe(edition, ctx.member.id);
    const now = new Date();
    const saved =
      filter &&
      (await ctx.db.gifts.updateOne(
        { ...filter, postedAt: { $exists: true } },
        input.arrived ? { $set: { arrivedAt: now, updatedAt: now } } : { $set: { updatedAt: now }, $unset: { arrivedAt: true } }
      ));
    if (!saved || saved.matchedCount === 0) throw new AppError('NOT_FOUND');
    return { arrived: input.arrived };
  }),

  /**
   * Organizer: the names of Santas who haven't marked a gift yet and, by post (87), who hasn't posted theirs. Never
   * what anyone got, for whom, or whether it arrived.
   */
  stillShopping: organizerEditionProcedure.query(async ({ ctx }) => {
    const { edition, group } = ctx;
    if (!isDrawn(edition)) return null;
    const santas = Object.keys(edition.draw?.assignments ?? {});
    const gifts = await currentGifts(ctx.db, edition);
    const namesOf = (ids: string[]) =>
      ids.map((id) => group.members.find((m) => m.id === id)?.name ?? '?').toSorted((a, b) => a.localeCompare(b));
    const notPosted = isPosted(edition) && { notPosted: namesOf(santas.filter((id) => !gifts.get(id)?.postedAt)) };
    return { santas: santas.length, stillShopping: namesOf(santas.filter((id) => !gifts.has(id))), ...notPosted };
  }),

  /** "3 gifts to open": how many gifts I get, from gift day on; null before, or when my Santa marked nothing. */
  toOpen: editionProcedure.query(async ({ ctx }) => {
    const counts = await giftCounts(ctx.db, ctx.edition);
    return { count: ctx.member.id in counts ? counts[ctx.member.id] : null };
  }),
});
