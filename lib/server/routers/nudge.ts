import * as v from 'valibot';
import { isDrawn } from '../../schema/edition';
import { NudgeKind, type Nudge } from '../../schema/nudge';
import { ownAndManagedIds, santaActionProcedure, santaViewProcedure } from '../between/santa-role';
import { newId } from '../db';
import { AppError } from '../errors';
import { enforceRateLimit } from '../rate-limit';
import { editionProcedure, router } from '../trpc';
import { visibleWishes } from '../wishlist/wish-view';

const DAY_MS = 24 * 60 * 60 * 1000;
/** One Psst! per Santa per edition in this window. */
const NUDGE_INTERVAL_MS = 3 * DAY_MS;
/** How long the giftee sees a Psst! in the app after it was delivered. */
const NUDGE_SHOWN_MS = 7 * DAY_MS;

/** "Add some ideas" only while the giftee's visible wishlist is empty; "more details" once it has wishes. */
const kindFor = (wishCount: number): NudgeKind => (wishCount === 0 ? 'emptyWishlist' : 'moreDetails');

/**
 * "Psst!" (30): a Santa asks their giftee for wishes, anonymously. The next cron tick emails
 * it; the giftee never sees the Santa's identity.
 */
export const nudgeRouter = router({
  /** Which Psst! the caller can send their giftee now, and when the next one is allowed. Null when not a Santa here. */
  status: santaViewProcedure.query(async ({ ctx }) => {
    if (!ctx.santaRole) return null;
    const { santa, giftee, answersOwnQuestions } = ctx.santaRole;
    const [wishes, last] = await Promise.all([
      visibleWishes(ctx.db, giftee),
      ctx.db.nudges.findOne({ editionId: ctx.edition._id, santaMemberId: santa.id }, { sort: { createdAt: -1 } }),
    ]);
    const nextTime = last ? last.createdAt.getTime() + NUDGE_INTERVAL_MS : 0;
    const nextAt = nextTime > Date.now() ? new Date(nextTime) : null;
    return {
      giftee: { name: giftee.name },
      kind: kindFor(wishes.length),
      canNudge: isDrawn(ctx.edition) && !answersOwnQuestions && !nextAt,
      answersOwnQuestions,
      nextAt,
    };
  }),

  send: santaActionProcedure.input(v.object({ kind: NudgeKind })).mutation(async ({ ctx, input }) => {
    if (!isDrawn(ctx.edition)) throw new AppError('EDITION_CLOSED');
    if (ctx.answersOwnQuestions) throw new AppError('FORBIDDEN');
    const wishes = await visibleWishes(ctx.db, ctx.giftee);
    if (input.kind !== kindFor(wishes.length)) throw new AppError('WRONG_NUDGE_KIND');
    await enforceRateLimit(`nudge:${ctx.edition._id}:${ctx.santa.id}`, { window: NUDGE_INTERVAL_MS / 1000, max: 1 });
    const now = new Date();
    const nudge: Nudge = {
      _id: newId(),
      editionId: ctx.edition._id,
      santaMemberId: ctx.santa.id,
      gifteeMemberId: ctx.giftee.id,
      kind: input.kind,
      sendAfter: now,
      createdAt: now,
    };
    await ctx.db.nudges.insertOne(nudge);
    return { kind: nudge.kind, nextAt: new Date(now.getTime() + NUDGE_INTERVAL_MS) };
  }),

  /** Delivered Psst!s for the caller and the members they manage (latest per person and kind). */
  forMe: editionProcedure.query(async ({ ctx }) => {
    const ownIds = ownAndManagedIds(ctx.group, ctx.member);
    const now = Date.now();
    const nudges = await ctx.db.nudges
      .find({
        editionId: ctx.edition._id,
        gifteeMemberId: { $in: ownIds },
        santaMemberId: { $nin: ownIds },
        sendAfter: { $lte: new Date(now), $gt: new Date(now - NUDGE_SHOWN_MS) },
      })
      .sort({ sendAfter: 1 })
      .toArray();
    // Ascending, so the Map keeps the latest per key.
    const latest = [...new Map(nudges.map((n) => [`${n.gifteeMemberId}:${n.kind}`, n])).values()];
    const shown = await Promise.all(
      latest.map(async (nudge) => {
        const member = ctx.group.members.find((m) => m.id === nudge.gifteeMemberId);
        if (!member) return null;
        // "Add some ideas" is done once there are wishes.
        if (nudge.kind === 'emptyWishlist' && (await visibleWishes(ctx.db, member)).length > 0) return null;
        return { id: nudge._id, kind: nudge.kind, forName: member.id === ctx.member.id ? null : member.name };
      })
    );
    return shown.filter((nudge) => nudge !== null);
  }),
});
