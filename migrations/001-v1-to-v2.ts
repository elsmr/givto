// Migration 001 (ticket 58): the old app's collections (master's format) → v2 users, groups,
// editions and wishes. Runbook: .scratch/58-migrations.md in the main checkout.
import type { Db, Document } from 'mongodb';
import * as v from 'valibot';
import { Edition } from '../lib/schema/edition';
import { Group } from '../lib/schema/group';
import { User } from '../lib/schema/user';
import { Wish } from '../lib/schema/wish';
import { email, isSlug, maskEmail } from './v1-to-v2/clean';
import { planV1ToV2, type Plan, type Report, type Target, type V1Group, type V1User } from './v1-to-v2/plan';

export const id = '001-v1-to-v2';

/** v2 reuses `users`, `groups` and `invites`, so the old collections move aside and stay until the owner drops them. */
const OLD_COLLECTIONS = ['users', 'groups', 'invites', 'loginCodes', 'refreshTokens'];
const V1_PREFIX = 'v1_';
/** A field only v2 documents have, for the collection names both apps use. */
const V2_FIELD: Record<string, string> = { users: 'emailVerified', groups: 'members', invites: 'tokenHash' };
const WRITTEN = ['users', 'groups', 'editions', 'wishes'] as const;

export interface Source {
  users: string;
  groups: string;
}

export type MigrationReport = Report & {
  renames?: string[];
  invalid: { collection: string; id: string; issues: string[] }[];
  samples: Record<string, unknown>;
  written?: Record<string, number>;
  verified?: Record<string, { planned: number; found: number }>;
};

const exists = async (db: Db, name: string) => (await db.listCollections({ name }, { nameOnly: true }).toArray()).length > 0;

/** Old collections still under their own name. Throws when one already holds v2 documents. */
const pendingRenames = async (db: Db) => {
  const renames: { from: string; to: string }[] = [];
  for (const name of OLD_COLLECTIONS) {
    if ((await exists(db, V1_PREFIX + name)) || !(await exists(db, name))) continue;
    const field = V2_FIELD[name];
    if (field && (await db.collection(name).findOne({ [field]: { $exists: true } }))) {
      throw new Error(`"${name}" already holds v2 documents and "${V1_PREFIX}${name}" doesn't exist: not an old database, or the v2 app already wrote to it. Nothing changed.`);
    }
    renames.push({ from: name, to: V1_PREFIX + name });
  }
  return renames;
};

/** Renames the old collections to v1_*, then builds the v2 documents from them. A dry run reads them where they are. */
export const up = async (db: Db, { apply, now = new Date() }: { apply: boolean; now?: Date }): Promise<MigrationReport> => {
  const renames = await pendingRenames(db);
  if (apply) for (const { from, to } of renames) await db.renameCollection(from, to);
  const current = (name: string) => (!apply && renames.some((r) => r.from === name) ? name : V1_PREFIX + name);
  const report = await migrateV1(db, { apply, now, source: { users: current('users'), groups: current('groups') } });
  const dropped = Object.fromEntries(
    await Promise.all(['invites', 'loginCodes', 'refreshTokens'].map(async (name) => [name, await db.collection(current(name)).estimatedDocumentCount()]))
  );
  return { ...report, source: { ...report.source, ...dropped }, renames: renames.map(({ from, to }) => `${from} → ${to}`) };
};

/** Builds v2 documents from old users and groups in `source`; with `apply`, inserts the ones that aren't there yet. */
export const migrateV1 = async (db: Db, { apply, now = new Date(), source }: { apply: boolean; now?: Date; source: Source }): Promise<MigrationReport> => {
  const [users, groups] = await Promise.all([
    db.collection<V1User>(source.users).find().toArray(),
    db.collection<V1Group>(source.groups).find().toArray(),
  ]);
  const plan = planV1ToV2({ users, groups }, await readTarget(db, users, groups), now);
  const invalid = validate(plan);
  const report = { ...plan.report, source: { users: users.length, groups: groups.length }, invalid, samples: samples(plan) };
  if (!apply) return report;
  if (invalid.length > 0) throw new Error(`${invalid.length} planned documents fail the v2 schemas (run without --apply to see them). Nothing written.`);
  const written: Record<string, number> = {};
  for (const name of WRITTEN) written[name] = await insertMissing(db, name, plan[name]);
  // The app creates these on start; creating them here proves the data fits before anyone signs in.
  await Promise.all([
    db.collection('users').createIndex({ email: 1 }, { unique: true }),
    db.collection('groups').createIndex({ slug: 1 }, { unique: true }),
    db.collection('editions').createIndex({ groupId: 1, number: 1 }, { unique: true }),
  ]);
  const verified = Object.fromEntries(
    await Promise.all(
      WRITTEN.map(async (name) => {
        const byId: Document = { _id: { $in: plan[name].map((doc) => doc._id) } };
        const found = await db.collection(name).countDocuments(byId);
        return [name, { planned: plan[name].length, found }];
      })
    )
  );
  return { ...report, written, verified };
};

const readTarget = async (db: Db, users: V1User[], groups: V1Group[]): Promise<Target> => {
  const emails = [...new Set(users.flatMap((user) => email(user.email) ?? []))];
  const slugs = groups.flatMap((group) => (isSlug(group.slug) ? [group.slug] : []));
  const [accounts, owners] = await Promise.all([
    db.collection('users').find({ email: { $in: emails }, emailVerified: { $exists: true } }, { projection: { email: 1 } }).toArray(),
    db.collection('groups').find({ slug: { $in: slugs }, members: { $exists: true } }, { projection: { slug: 1 } }).toArray(),
  ]);
  const oldIds = new Set(users.map((user) => user._id.toHexString()));
  const otherAccounts = accounts.map((a) => a._id.toHexString()).filter((accountId) => !oldIds.has(accountId));
  const counts = await db
    .collection('wishes')
    .aggregate<{ _id: string; count: number }>([{ $match: { ownerId: { $in: otherAccounts } } }, { $group: { _id: '$ownerId', count: { $sum: 1 } } }])
    .toArray();
  return {
    accountIds: new Map(accounts.map((a) => [a.email as string, a._id.toHexString()])),
    slugOwners: new Map(owners.map((g) => [g.slug as string, String(g._id)])),
    wishCounts: new Map(counts.map(({ _id, count }) => [_id, count])),
  };
};

const validate = (plan: Plan): MigrationReport['invalid'] => {
  const check = (collection: string, schema: v.GenericSchema, docs: { _id: unknown }[]) =>
    docs.flatMap((doc) => {
      const result = v.safeParse(schema, doc);
      return result.success ? [] : [{ collection, id: String(doc._id), issues: result.issues.slice(0, 3).map((i) => `${v.getDotPath(i) ?? ''}: ${i.message}`) }];
    });
  return [
    ...check('users', User, plan.users),
    ...check('groups', Group, plan.groups),
    ...check('editions', Edition, plan.editions),
    ...check('wishes', Wish, plan.wishes),
  ];
};

/** One of each, a drawn edition's group if there is one. */
const samples = (plan: Plan) => {
  const edition = plan.editions.find((e) => e.draw) ?? plan.editions[0];
  const user = plan.users[0];
  return {
    user: user && { ...user, email: maskEmail(user.email) },
    group: plan.groups.find((g) => g._id === edition?.groupId),
    edition,
    wish: plan.wishes[0],
  };
};

/** Insert-if-absent by `_id`: re-runs and resumed runs leave existing documents alone. */
const insertMissing = async (db: Db, name: string, docs: Document[]) => {
  if (docs.length === 0) return 0;
  const ops = docs.map(({ _id, ...doc }) => ({ updateOne: { filter: { _id }, update: { $setOnInsert: doc }, upsert: true } }));
  return (await db.collection(name).bulkWrite(ops, { ordered: false })).upsertedCount;
};
