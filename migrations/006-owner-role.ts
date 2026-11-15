// Migration 006: groups get several organizers, and the one organizer each group had becomes its owner. Run right
// after the deploy: the code before it knows no 'owner' and would lock that person out of organizing.
import type { Db } from 'mongodb';
import type { MigrationReport } from './001-v1-to-v2';

export const id = '006-owner-role';

type OldGroup = { _id: string; members: { role: string }[] };

export const up = async (db: Db, { apply }: { apply: boolean; now?: Date }): Promise<MigrationReport> => {
  const groups = db.collection<OldGroup>('groups');
  const filter = { 'members.role': 'organizer', members: { $not: { $elemMatch: { role: 'owner' } } } };
  const planned = await groups.countDocuments(filter);
  const report: MigrationReport = {
    source: { groups: await groups.countDocuments({ members: { $exists: true } }) },
    planned: { groups: planned },
    conflicts: {},
    invalid: [],
    samples: {},
  };
  if (!apply) return report;
  const { modifiedCount } = await groups.updateMany(filter, { $set: { 'members.$[m].role': 'owner' } }, { arrayFilters: [{ 'm.role': 'organizer' }] });
  return { ...report, written: { groups: modifiedCount } };
};
