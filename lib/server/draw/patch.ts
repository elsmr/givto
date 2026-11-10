import { randomInt } from 'node:crypto';
import { drawAssignments, findStuckGivers } from '../../draw';
import { slotIn, takeOut } from '../../draw-patch';
import { isDrawn, type Assignments, type Edition } from '../../schema/edition';
import type { Group } from '../../schema/group';
import type { Collections } from '../db';
import { sendDrawNoticesNow } from '../jobs/draw-notices';
import { allRules, drawRules } from './rules';
import { saveDraw } from './save';

const ATTEMPTS = 5;

type Plan = (group: Group, edition: Edition, assignments: Assignments) => Promise<Assignments | null | 'skip'>;

/** Re-reads and retries when a concurrent change to the same draw won. */
const patchDraw = async (db: Collections, groupId: string, editionId: string, plan: Plan) => {
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const [group, edition] = await Promise.all([
      db.groups.findOne({ _id: groupId }),
      db.editions.findOne({ _id: editionId }),
    ]);
    if (!group || !edition?.draw || !isDrawn(edition)) return;
    const next = await plan(group, edition, edition.draw.assignments);
    if (next === 'skip') return;
    if (await saveDraw(db, { ...edition, draw: edition.draw }, next, new Date())) {
      await sendDrawNoticesNow(db, editionId);
      return;
    }
  }
  throw new Error(`Draw of edition ${editionId} kept changing`);
};

/**
 * Late joiner (PLAN-v2): A→B becomes A→joiner→B, so only A's giftee changes and A is told.
 * When nobody fits, the joiner stays out of the draw until the organizer re-draws.
 */
export const slotInLateJoiner = (db: Collections, groupId: string, editionId: string, memberId: string) =>
  patchDraw(db, groupId, editionId, async (group, edition, assignments) => {
    if (memberId in assignments) return 'skip';
    const rules = allRules(await drawRules(db, group, edition));
    return slotIn(assignments, memberId, rules, randomInt) ?? 'skip';
  });

/**
 * Someone leaves or is removed after the draw (48): A→leaver→B becomes A→B, else one swap,
 * else a fresh draw of everyone left, else back to open for the organizer.
 */
export const takeOutOfDraw = (db: Collections, groupId: string, editionId: string, memberId: string) =>
  patchDraw(db, groupId, editionId, async (group, edition, assignments) => {
    if (!(memberId in assignments)) return 'skip';
    const rules = allRules(await drawRules(db, group, edition));
    const patched = takeOut(assignments, memberId, rules, randomInt);
    if (patched) return patched;
    const rest = Object.keys(assignments).filter((id) => id !== memberId);
    return findStuckGivers(rest, rules) ? null : drawAssignments(rest, rules, randomInt);
  });
