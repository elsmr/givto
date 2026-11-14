import type { Edition } from '../../schema/edition';
import type { Group } from '../../schema/group';
import type { Member } from '../../schema/member';
import { drawParticipantIds } from '../draw/rules';

/**
 * The people whose boards the caller sees: everyone in but the caller, so a manager sees their kid's board. Empty
 * unless the edition is an opened conspiracy and the caller is in it (the organizer too). There is no `asMemberId`: acting
 * for a kid would otherwise reach the manager's own board.
 */
export const boardPeople = (group: Group, edition: Edition, caller: Member): Member[] => {
  if (edition.kind !== 'conspiracy' || edition.status === 'draft') return [];
  const ids = drawParticipantIds(group, edition);
  if (!ids.includes(caller.id)) return [];
  return ids.filter((id) => id !== caller.id).map((id) => group.members.find((m) => m.id === id)!);
};
