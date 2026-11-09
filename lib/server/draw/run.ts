import { randomInt } from 'node:crypto';
import { drawAssignments } from '../../draw';
import type { Edition } from '../../schema/edition';
import type { Group } from '../../schema/group';
import type { Collections } from '../db';
import { AppError } from '../errors';
import { allRules, assertDrawable, drawParticipantIds, drawRules } from './rules';
import { historyWith, saveDraw } from './save';

/** "Draw names" (34), by the organizer or the scheduler: draft/open → drawn. */
export const drawEdition = async (db: Collections, group: Group, edition: Edition, now = new Date()) => {
  if (edition.status !== 'draft' && edition.status !== 'open') throw new AppError('ALREADY_DRAWN');
  const ids = drawParticipantIds(group, edition);
  const rules = await drawRules(db, group, edition);
  assertDrawable(ids, rules);
  const assignments = drawAssignments(ids, allRules(rules), randomInt);
  const drawn = await db.editions.updateOne(
    { _id: edition._id, status: edition.status },
    {
      $set: {
        status: 'drawn',
        'statusChangedAt.drawn': now,
        draw: { assignments, drawnAt: now, history: historyWith(edition.draw, now) },
        updatedAt: now,
      },
    }
  );
  if (drawn.matchedCount === 0) throw new AppError('ALREADY_DRAWN');
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
};
