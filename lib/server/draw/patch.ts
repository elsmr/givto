import { randomInt } from 'node:crypto';
import { drawAssignments, findStuckGivers } from '../../draw';
import { slotIn, takeOut } from '../../draw-patch';
import type { Assignments, Edition } from '../../schema/edition';
import { MIN_PARTICIPANTS, type Group } from '../../schema/group';
import type { Collections } from '../db';
import { sendDrawNoticesNow } from '../jobs/draw-notices';
import { allRules, assertDrawable, drawParticipantIds, drawRules } from './rules';
import { saveDraw } from './save';

const ATTEMPTS = 5;

type Change = { next: Assignments; redraw: boolean } | 'skip';
type Plan = (group: Group, edition: Edition, assignments: Assignments) => Promise<Change>;

/**
 * Re-reads and retries when a concurrent change to the same draw won. Only while `drawn`: from gift day on the draw
 * is history (105), nobody gets a new giftee.
 */
const patchDraw = async (db: Collections, groupId: string, editionId: string, plan: Plan) => {
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const [group, edition] = await Promise.all([
      db.groups.findOne({ _id: groupId }),
      db.editions.findOne({ _id: editionId }),
    ]);
    if (!group || !edition?.draw || edition.status !== 'drawn') return;
    const change = await plan(group, edition, edition.draw.assignments);
    if (change === 'skip') return;
    if (await saveDraw(db, { ...edition, draw: edition.draw }, change.next, new Date(), { redraw: change.redraw })) {
      await sendDrawNoticesNow(db, editionId);
      return;
    }
  }
  throw new Error(`Draw of edition ${editionId} kept changing`);
};

/** Santas with Dibs! or a gift marked (bought or posted) in this edition: a late joiner never takes their giftee (105). */
const startedSantas = async (db: Collections, editionId: string): Promise<string[]> => {
  const [claimed, marked] = await Promise.all([
    db.claims.distinct('santaMemberId', { editionId }),
    db.gifts.distinct('santaMemberId', { editionId }),
  ]);
  return [...claimed, ...marked];
};

/**
 * Late joiner (PLAN-v2): A→B becomes A→joiner→B, so only A's giftee changes and A is told. When nobody fits, the
 * joiner stays out of the draw and the organizer sees it (re-draw or let them sit this one out). Someone who left
 * after the draw and came back sits it out (105): they're not in the draw's participants.
 */
export const slotInLateJoiner = (db: Collections, groupId: string, editionId: string, memberId: string) =>
  patchDraw(db, groupId, editionId, async (group, edition, assignments) => {
    if (memberId in assignments || !drawParticipantIds(group, edition).includes(memberId)) return 'skip';
    const rules = allRules(await drawRules(db, group, edition));
    const next = slotIn(assignments, memberId, rules, randomInt, await startedSantas(db, edition._id));
    return next ? { next, redraw: false } : 'skip';
  });

/**
 * Someone leaves or is removed after the draw (48): A→leaver→B becomes A→B, else one swap, else a re-draw of
 * everyone left (105: the remove dialog warns, `removalEffect`). When no draw works without them, `refuse` throws
 * the draw's error (the organizer's Remove); otherwise they stay in the draw and the organizer sees it.
 */
export const takeOutOfDraw = (db: Collections, groupId: string, editionId: string, memberId: string, { refuse = false } = {}) =>
  patchDraw(db, groupId, editionId, async (group, edition, assignments) => {
    if (!(memberId in assignments)) return 'skip';
    const rules = await drawRules(db, group, edition);
    const patched = takeOut(assignments, memberId, allRules(rules), randomInt);
    if (patched) return { next: patched, redraw: false };
    const rest = drawParticipantIds(group, edition).filter((id) => id !== memberId);
    const stuck = rest.length < MIN_PARTICIPANTS || Boolean(findStuckGivers(rest, allRules(rules)));
    if (stuck && refuse) assertDrawable(rest, rules);
    return stuck ? 'skip' : { next: drawAssignments(rest, allRules(rules), randomInt), redraw: true };
  });

/** What taking this member out does to the names drawn: nothing (not in the draw), a patch, or a re-draw for everyone. */
export const removalEffect = async (db: Collections, group: Group, edition: Edition, memberId: string) => {
  const assignments = edition.draw?.assignments;
  if (edition.status !== 'drawn' || !assignments || !(memberId in assignments)) return 'none';
  const rules = allRules(await drawRules(db, group, edition));
  return takeOut(assignments, memberId, rules, () => 0) === null ? 'redraw' : 'patch';
};
