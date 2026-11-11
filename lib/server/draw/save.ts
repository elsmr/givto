import { changedSantas } from '../../draw-patch';
import type { Assignments, Draw, Edition } from '../../schema/edition';
import type { Collections } from '../db';

/** The draw's history with the current result added (27: kept for re-draws). */
export const historyWith = (draw: Draw | undefined, now: Date): Draw['history'] =>
  draw && Object.keys(draw.assignments).length > 0
    ? [...draw.history, { assignments: draw.assignments, drawnAt: draw.drawnAt, replacedAt: now }]
    : (draw?.history ?? []);

/**
 * Replaces a finished draw's assignments, unless someone else changed the draw first (then
 * false: re-read and try again). Santas with a different giftee are told in-app
 * (`gifteeChangedAt`) and lose their Dibs! in this edition: those were for their old giftee.
 * `next: null` = nobody can be matched any more: the edition goes back to open and the
 * organizer draws again. `redraw`: a whole new draw, the old one goes to history.
 * Guesses (62) go with a whole new draw or no draw; a slot change keeps them: dropping only the
 * guesses of people whose Santa changed would tell them so.
 */
export const saveDraw = async (
  db: Collections,
  edition: Edition & { draw: Draw },
  next: Assignments | null,
  now: Date,
  { redraw = false } = {}
): Promise<boolean> => {
  const previous = edition.draw.assignments;
  const filter = { _id: edition._id, status: edition.status, 'draw.assignments': previous };
  if (!next) {
    const reopened = await db.editions.updateOne(filter, {
      $set: {
        status: 'open',
        'statusChangedAt.open': now,
        draw: { assignments: {}, drawnAt: edition.draw.drawnAt, history: historyWith(edition.draw, now) },
        updatedAt: now,
      },
    });
    if (reopened.matchedCount > 0) {
      const inEdition = { editionId: edition._id };
      await Promise.all([db.claims.deleteMany(inEdition), db.gifts.deleteMany(inEdition), db.guesses.deleteMany(inEdition)]);
    }
    return reopened.matchedCount > 0;
  }
  const changed = changedSantas(previous, next).filter((santa) => santa in previous);
  const saved = await db.editions.updateOne(
    filter,
    {
      $set: {
        'draw.assignments': next,
        ...(redraw && { 'draw.drawnAt': now, 'draw.history': historyWith(edition.draw, now) }),
        'participants.$[changed].gifteeChangedAt': now,
        drawNoticesPendingAt: now,
        updatedAt: now,
      },
    },
    { arrayFilters: [{ 'changed.memberId': { $in: changed } }] }
  );
  if (saved.matchedCount === 0) return false;
  if (redraw) await db.guesses.deleteMany({ editionId: edition._id });
  if (changed.length > 0) {
    const ofChanged = { editionId: edition._id, santaMemberId: { $in: changed } };
    await Promise.all([db.claims.deleteMany(ofChanged), db.gifts.deleteMany(ofChanged)]);
  }
  return true;
};
