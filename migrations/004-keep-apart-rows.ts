// Migration 004 (100): a group's older keep-apart pairs (`exclusions`, two directed rules each, only ever written by
// migration 001) become keep-apart rows of two, and the unused `defaults` goes. Run after the deploy: the code before
// it reads `exclusions` and fails without it.
import { ObjectId, type Db } from 'mongodb';
import type { MigrationReport } from './001-v1-to-v2';

export const id = '004-keep-apart-rows';

type OldGroup = {
  _id: string;
  households: { id: string; name?: string; memberIds: string[] }[];
  exclusions?: { from: string; to: string }[];
  defaults?: unknown;
};

/**
 * The group's rows with each pair (both directions stored) added as a row of two, unless a row already keeps them
 * apart, and the one-way rules that can't be a row (dropped: the app never wrote any).
 */
export const withPairRows = ({ households, exclusions = [] }: OldGroup, newId: () => string) => {
  const stored = new Set(exclusions.map(({ from, to }) => `${from}>${to}`));
  const isPair = ({ from, to }: { from: string; to: string }) => stored.has(`${to}>${from}`);
  const covered = (a: string, b: string) => households.some((h) => h.memberIds.includes(a) && h.memberIds.includes(b));
  const pairs = exclusions.filter((e) => isPair(e) && e.from < e.to && !covered(e.from, e.to));
  return {
    households: [...households, ...pairs.map(({ from, to }) => ({ id: newId(), memberIds: [from, to] }))],
    oneWay: exclusions.filter((e) => !isPair(e)),
  };
};

export const up = async (db: Db, { apply }: { apply: boolean; now?: Date }): Promise<MigrationReport> => {
  const groups = await db
    .collection<OldGroup>('groups')
    .find({ $or: [{ exclusions: { $exists: true } }, { defaults: { $exists: true } }] }, { projection: { households: 1, exclusions: 1 } })
    .toArray();
  const changes = groups.map((group) => ({ _id: group._id, ...withPairRows(group, () => new ObjectId().toHexString()) }));
  const oneWay = changes.flatMap(({ _id, oneWay }) => oneWay.map((rule) => ({ group: _id, ...rule })));
  const report: MigrationReport = {
    source: { groups: groups.length },
    planned: { groups: changes.length, rows: changes.reduce((sum, c, i) => sum + c.households.length - groups[i].households.length, 0) },
    conflicts: { oneWayDropped: { count: oneWay.length, samples: oneWay.slice(0, 5) } },
    invalid: [],
    samples: { group: changes.find((c, i) => c.households.length > groups[i].households.length) },
  };
  if (!apply) return report;
  const ops = changes.map(({ _id, households }) => ({
    updateOne: { filter: { _id }, update: { $set: { households }, $unset: { exclusions: true as const, defaults: true as const } } },
  }));
  const written = ops.length === 0 ? 0 : (await db.collection<OldGroup>('groups').bulkWrite(ops, { ordered: false })).modifiedCount;
  return { ...report, written: { groups: written } };
};
