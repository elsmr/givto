import { findStuckGivers, type Exclusion } from '../../draw';
import { toExclusions } from '../../exclusions';
import { drawsNames, type Edition } from '../../schema/edition';
import { MIN_PARTICIPANTS, type Group } from '../../schema/group';
import type { Collections } from '../db';
import { AppError } from '../errors';

/** Who's in the draw: ticked, joined for this edition, and still a joined member of the group. */
export const drawParticipantIds = (group: Group, edition: Edition): string[] => {
  const joined = new Set(group.members.filter((m) => m.status === 'joined').map((m) => m.id));
  return edition.participants
    .filter((p) => p.participates && p.status === 'joined' && joined.has(p.memberId))
    .map((p) => p.memberId);
};

/** Who unwraps on gift day (32): the draw's Santas, or everyone in when the kind has no draw (88). */
export const playerIds = (group: Group, edition: Edition): string[] =>
  drawsNames(edition) ? Object.keys(edition.draw?.assignments ?? {}) : drawParticipantIds(group, edition);

export interface DrawRules {
  /** Keep-apart rows (households) and older keep-apart pairs (26). */
  standing: Exclusion[];
  /** "Not the same as last time" (33): one-way, from the previous edition's draw. Never leaves the server. */
  previous: Exclusion[];
}

export const drawRules = async (db: Collections, group: Group, edition: Edition): Promise<DrawRules> => {
  const standing = [...group.exclusions, ...toExclusions(group.households.map((h) => h.memberIds))];
  if (!edition.avoidPreviousGiftees || !edition.previousEditionId) return { standing, previous: [] };
  const previousEdition = await db.editions.findOne(
    { _id: edition.previousEditionId, groupId: group._id },
    { projection: { draw: 1 } }
  );
  const previous = Object.entries(previousEdition?.draw?.assignments ?? {}).map(([from, to]) => ({ from, to }));
  return { standing, previous };
};

export const allRules = ({ standing, previous }: DrawRules): Exclusion[] => [...standing, ...previous];

/**
 * TOO_FEW_PEOPLE or DRAW_IMPOSSIBLE. Stuck names come from the standing rules only: a stuck
 * set under "not the same as last time" could hint at the previous pairs, so that case has no names.
 */
export const assertDrawable = (ids: string[], rules: DrawRules) => {
  if (ids.length < MIN_PARTICIPANTS) throw new AppError('TOO_FEW_PEOPLE', { details: { min: MIN_PARTICIPANTS } });
  const stuck = findStuckGivers(ids, rules.standing);
  if (stuck) throw new AppError('DRAW_IMPOSSIBLE', { details: { givers: stuck.givers, receivers: stuck.receivers } });
  if (rules.previous.length > 0 && findStuckGivers(ids, allRules(rules))) {
    throw new AppError('DRAW_IMPOSSIBLE', { details: { avoidPreviousGiftees: true } });
  }
};
