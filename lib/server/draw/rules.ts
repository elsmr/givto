import { findStuckGivers, type Exclusion } from '../../draw';
import { toExclusions } from '../../exclusions';
import type { Edition, EditionStatus } from '../../schema/edition';
import { MIN_PARTICIPANTS, type Group } from '../../schema/group';
import type { Collections } from '../db';
import { AppError } from '../errors';

/** Statuses in which `edition.draw` is the live result. */
export const drawnStatuses: EditionStatus[] = ['drawn', 'giftday'];
export const isDrawn = (edition: Edition) => drawnStatuses.includes(edition.status);

/** Who's in the draw: ticked, joined for this edition, and still a joined member of the group. */
export const drawParticipantIds = (group: Group, edition: Edition): string[] => {
  const joined = new Set(group.members.filter((m) => m.status === 'joined').map((m) => m.id));
  return edition.participants
    .filter((p) => p.participates && p.status === 'joined' && joined.has(p.memberId))
    .map((p) => p.memberId);
};

export interface DrawRules {
  /** Households and keep-apart pairs (26). */
  standing: Exclusion[];
  /** "Not the same as last year" (33): one-way, from the previous edition's draw. Never leaves the server. */
  previous: Exclusion[];
}

export const drawRules = async (db: Collections, group: Group, edition: Edition): Promise<DrawRules> => {
  const standing = [...group.exclusions, ...toExclusions(group.households.map((h) => h.memberIds), [])];
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
 * set under "not the same as last year" could hint at last year's pairs, so that case has no names.
 */
export const assertDrawable = (ids: string[], rules: DrawRules) => {
  if (ids.length < MIN_PARTICIPANTS) throw new AppError('TOO_FEW_PEOPLE', { details: { min: MIN_PARTICIPANTS } });
  const stuck = findStuckGivers(ids, rules.standing);
  if (stuck) throw new AppError('DRAW_IMPOSSIBLE', { details: { givers: stuck.givers, receivers: stuck.receivers } });
  if (rules.previous.length > 0 && findStuckGivers(ids, allRules(rules))) {
    throw new AppError('DRAW_IMPOSSIBLE', { details: { avoidPreviousGiftees: true } });
  }
};
