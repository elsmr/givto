import { randomInt } from 'node:crypto';
import { drawAssignments } from '../../draw';
import { drawsNames, isBeforeDraw, type Edition } from '../../schema/edition';
import { MIN_PARTICIPANTS, type Group } from '../../schema/group';
import type { Collections } from '../db';
import { AppError } from '../errors';
import { sendDrawNoticesNow } from '../jobs/draw-notices';
import { allRules, assertDrawable, drawParticipantIds, drawRules } from './rules';
import { historyWith, saveDraw } from './save';

/** "Draw names" (34), by the organizer or the scheduler: draft/open → drawn. */
export const drawEdition = async (db: Collections, group: Group, edition: Edition, now = new Date()) => {
  if (!drawsNames(edition)) throw new AppError('FORBIDDEN');
  if (!isBeforeDraw(edition)) throw new AppError('ALREADY_DRAWN');
  const ids = drawParticipantIds(group, edition);
  const rules = await drawRules(db, group, edition);
  assertDrawable(ids, rules);
  const assignments = drawAssignments(ids, allRules(rules), randomInt);
  const drawn = await db.editions.updateOne(
    // Not switched to a kind without a draw since it was read.
    { _id: edition._id, status: edition.status, kind: edition.kind ?? { $exists: false } },
    {
      $set: {
        status: 'drawn',
        'statusChangedAt.drawn': now,
        draw: { assignments, drawnAt: now, history: historyWith(edition.draw, now) },
        drawNoticesPendingAt: now,
        updatedAt: now,
      },
    }
  );
  if (drawn.matchedCount === 0) throw new AppError('ALREADY_DRAWN');
  await sendDrawNoticesNow(db, edition._id);
};

/**
 * "Lock in" for kinds without a draw (88): draft/open → drawn, like the draw; nobody gets a giftee and nothing is sent. Whoever joins
 * later is still in; gift day and its reminders follow the status as for a draw.
 */
export const lockInEdition = async (db: Collections, group: Group, edition: Edition, now = new Date()) => {
  if (drawsNames(edition)) throw new AppError('FORBIDDEN');
  if (!isBeforeDraw(edition)) throw new AppError('ALREADY_DRAWN');
  if (drawParticipantIds(group, edition).length < MIN_PARTICIPANTS) throw new AppError('TOO_FEW_PEOPLE', { details: { min: MIN_PARTICIPANTS } });
  const locked = await db.editions.updateOne(
    { _id: edition._id, status: edition.status, kind: edition.kind },
    { $set: { status: 'drawn', 'statusChangedAt.drawn': now, updatedAt: now } }
  );
  if (locked.matchedCount === 0) throw new AppError('ALREADY_DRAWN');
};

/** Organizer re-draw before gift day (27): a fresh draw of everyone in; the old one goes to history. */
export const redrawEdition = async (db: Collections, group: Group, edition: Edition, now = new Date()) => {
  if (edition.status !== 'drawn' || !edition.draw) throw new AppError('NOT_DRAWN');
  const ids = drawParticipantIds(group, edition);
  const rules = await drawRules(db, group, edition);
  assertDrawable(ids, rules);
  const assignments = drawAssignments(ids, allRules(rules), randomInt);
  const saved = await saveDraw(db, { ...edition, draw: edition.draw }, assignments, now, { redraw: true });
  if (!saved) throw new AppError('EDITION_CHANGED');
  await sendDrawNoticesNow(db, edition._id);
};
