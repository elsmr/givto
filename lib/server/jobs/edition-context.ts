import type { Edition } from '../../schema/edition';
import type { Group } from '../../schema/group';
import type { Collections } from '../db';

/** Loads editions and their (not deleted) groups once per job run. */
export const editionContext = (db: Collections) => {
  const editions = new Map<string, Promise<Edition | null>>();
  const groups = new Map<string, Promise<Group | null>>();
  const edition = (id: string) => {
    if (!editions.has(id)) editions.set(id, db.editions.findOne({ _id: id }));
    return editions.get(id)!;
  };
  const group = (id: string) => {
    if (!groups.has(id)) groups.set(id, db.groups.findOne({ _id: id, deletedAt: { $exists: false } }));
    return groups.get(id)!;
  };
  /** The edition with its group, or null when either is gone. */
  return async (editionId: string): Promise<{ edition: Edition; group: Group } | null> => {
    const found = await edition(editionId);
    const owner = found && (await group(found.groupId));
    return found && owner ? { edition: found, group: owner } : null;
  };
};
