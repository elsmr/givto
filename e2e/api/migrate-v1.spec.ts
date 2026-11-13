// Ticket 58: old production data (master's format) → v2. The migration runs on its own database
// (it renames collections), except the sign-in test, which migrates prefixed old collections into
// the app's database.
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { MongoClient, ObjectId, type Db } from 'mongodb';
import * as v from 'valibot';
import { Edition } from '@/lib/schema/edition';
import { Group } from '@/lib/schema/group';
import { User } from '@/lib/schema/user';
import { Wish } from '@/lib/schema/wish';
import { collections } from '@/lib/server/db';
import { migrateV1 } from '@/migrations/001-v1-to-v2';
import { runMigrations } from '@/migrations/runner';
import { edge, generateV1 } from '@/migrations/v1-sample';
import type { V1Group, V1User } from '@/migrations/v1-to-v2/plan';
import { MONGODB_URI, ROOT_DIR } from '../env';
import { expect, mailsTo, ok, requestSignIn, signInWithCode, test, uniqueEmail } from '../fixtures';
import { createGroup, join } from './s4-group';

const withDb = async (run: (db: Db) => Promise<void>) => {
  const client = await new MongoClient(MONGODB_URI).connect();
  const db = client.db(`givto_mig_${randomBytes(4).toString('hex')}`);
  try {
    await run(db);
  } finally {
    await db.dropDatabase();
    await client.close();
  }
};

/** The app's procedures as this account against `db` (appRouter.createCaller in e2e/support/caller.ts); results as JSON. */
const callAs = (db: Db, userId: string, calls: { path: string; input?: object }[]): any[] => {
  const args = JSON.stringify({ uri: MONGODB_URI, db: db.databaseName, userId, calls });
  const env = { ...process.env, LOG_LEVEL: 'silent' };
  return JSON.parse(execFileSync(process.execPath, ['--import', './tests/ts-hooks.mjs', 'e2e/support/caller.ts', args], { cwd: ROOT_DIR, env }).toString());
};

const snapshot = async (db: Db) =>
  Promise.all((await db.listCollections().toArray()).map(async ({ name }) => `${name}:${await db.collection(name).countDocuments()}`)).then((list) => list.sort());

const normalized = (email: unknown) => String(email).trim().toLowerCase();

test('migration 001 on a synthetic old database: valid v2 documents, merges, edge cases, dry run, re-run', async () => {
  await withDb(async (db) => {
    const data = generateV1({ now: new Date() });
    for (const [name, docs] of Object.entries(data)) await db.collection(name).insertMany(docs);
    const c = collections(db);
    const oldBy = (email: string) => data.users.filter((u) => normalized(u.email) === email).toSorted((a, b) => a._id.toHexString().localeCompare(b._id.toHexString()));
    const oldGroupWith = (user: V1User) => data.groups.filter((g) => (g.users as ObjectId[]).some((id) => id.equals(user._id)));

    await test.step('dry run writes nothing', async () => {
      const before = await snapshot(db);
      const [result] = await runMigrations(db, { apply: false });
      expect(result.status).toBe('dry run');
      expect(result.report!.invalid).toEqual([]);
      expect(result.report!.conflicts.mergedDuplicateEmail.count).toBe(2);
      expect(await snapshot(db)).toEqual(before);
    });

    await test.step('apply: old collections kept as v1_*, every new document passes the v2 schemas', async () => {
      const [result] = await runMigrations(db, { apply: true });
      expect(result.status).toBe('applied');
      const names = (await db.listCollections().toArray()).map((col) => col.name);
      expect(names).toEqual(expect.arrayContaining(['v1_users', 'v1_groups', 'v1_loginCodes', 'v1_refreshTokens', 'migrations']));
      for (const user of await c.users.find().toArray()) v.parse(User, user);
      for (const group of await c.groups.find().toArray()) v.parse(Group, group);
      for (const edition of await c.editions.find().toArray()) v.parse(Edition, edition);
      for (const wish of await c.wishes.find().toArray()) {
        v.parse(Wish, wish);
        expect(Array.isArray((wish as { links?: unknown }).links)).toBe(true);
      }
      const referenced = new Set(data.groups.flatMap((g) => [g.creator, ...(g.users as ObjectId[]), ...Object.keys(g.wishlists as object)].map(String)));
      const usedEmails = new Set(data.users.filter((u) => referenced.has(u._id.toHexString())).map((u) => normalized(u.email)).filter((email) => email.includes('@')));
      expect(await c.users.countDocuments()).toBe(usedEmails.size);
      const groups = await c.groups.find().toArray();
      const managed = new Set(groups.flatMap((g) => g.members.filter((m) => !m.userId).map((m) => m.id)));
      const owners = (await c.wishes.distinct('ownerId')).filter((id) => !managed.has(id));
      const accountIds = (await c.users.find().toArray()).map((u) => u._id.toHexString());
      expect(accountIds.toSorted()).toEqual([...new Set([...groups.flatMap((g) => g.members.flatMap((m) => m.userId ?? [])), ...owners])].toSorted());
      expect(result.report!.conflicts.skippedUnusedAccount.count).toBe(new Set(data.users.map((u) => normalized(u.email)).filter((email) => email.includes('@'))).size - usedEmails.size);
      expect(await c.groups.countDocuments()).toBe(data.groups.length - 1); // the one with only deleted users and an invalid email
      expect(await c.editions.countDocuments({ number: 1 })).toBe(await c.groups.countDocuments());
    });

    await test.step('duplicate emails: one account, the oldest id; invalid email: managed member', async () => {
      for (const email of [edge.duplicateEmail, edge.exactDuplicateEmail]) {
        const accounts = await c.users.find({ email }).toArray();
        expect(accounts.map((a) => a._id.toHexString())).toEqual([oldBy(email)[0]._id.toHexString()]);
      }
      expect(await c.users.countDocuments({ email: edge.invalidEmail })).toBe(0);
      const [invalidUser] = data.users.filter((u) => u.email === edge.invalidEmail);
      const group = (await c.groups.findOne({ _id: oldGroupWith(invalidUser)[0]._id.toHexString() }))!;
      const managed = group.members.find((m) => !m.userId)!;
      expect(managed).toMatchObject({ name: 'Ivo Invalid', managedBy: group.members.find((m) => m.role === 'organizer')!.id });
      expect(await c.wishes.countDocuments({ ownerId: managed.id, title: 'Coffee' })).toBe(1);
    });

    await test.step('slugs, statuses, deleted people and odd timestamps', async () => {
      const shared = data.groups.filter((g) => g.slug === edge.sharedSlug).map((g) => g._id.toHexString());
      expect((await c.groups.findOne({ slug: edge.sharedSlug }))!._id).toBe(shared.toSorted()[0]);
      expect(await c.groups.countDocuments({ _id: { $in: shared } })).toBe(2);
      expect(await c.groups.countDocuments({ slug: { $in: [edge.invalidSlug, 'abc'] } })).toBe(0);
      expect(await c.groups.countDocuments({ slug: edge.customSlug })).toBe(1);
      const editionOf = async (slug: string) => (await c.editions.findOne({ groupId: (await c.groups.findOne({ slug }))!._id }))!;
      expect(await editionOf(edge.recentDrawnSlug)).toMatchObject({ status: 'drawn', draw: expect.anything() });
      expect(await editionOf(edge.recentOpenSlug)).toMatchObject({ status: 'open' });
      expect((await editionOf(edge.recentOpenSlug)).draw).toBeUndefined();
      for (const group of await c.groups.find().toArray()) {
        const ids = new Set(group.members.map((m) => m.id));
        const edition = (await c.editions.findOne({ groupId: group._id }))!;
        expect(group.members.filter((m) => m.role === 'organizer')).toHaveLength(1);
        expect(group.createdBy).toBe(group.members.find((m) => m.role === 'organizer')!.userId);
        for (const [santa, giftee] of Object.entries(edition.draw?.assignments ?? {})) expect(ids.has(santa) && ids.has(giftee)).toBe(true);
        expect(group.createdAt.getTime()).toBeLessThanOrEqual(Date.now());
        expect(edition.year).toBe(Number(new Intl.DateTimeFormat('en', { timeZone: 'Europe/Brussels', year: 'numeric' }).format(group.createdAt)));
      }
    });

    await test.step('a migrated person sees their groups, editions, draw and merged wishlist', async () => {
      const [dupA, dupC] = [' Dup.Case@Example.com', 'DUP.CASE@EXAMPLE.COM '].map((raw) => data.users.find((u) => u.email === raw)!);
      const userId = (await c.users.findOne({ email: edge.duplicateEmail }))!._id.toHexString();
      const [older, newer] = [oldGroupWith(dupA)[0], oldGroupWith(dupC)[0]] as V1Group[];
      const [olderSlug, newerSlug] = [older.slug as string, newer.slug as string];
      const [groups, home, mine, wishes, inOlder] = callAs(db, userId, [
        { path: 'account.groups' },
        { path: 'group.get', input: { groupSlug: newerSlug } },
        { path: 'draw.mine', input: { groupSlug: newerSlug, editionNumber: 1 } },
        { path: 'wish.list' },
        { path: 'wish.groupView', input: { groupSlug: olderSlug } },
      ]);
      expect(groups.map((g: { slug: string }) => g.slug)).toEqual(expect.arrayContaining([olderSlug, newerSlug]));
      expect(home.edition).toMatchObject({ number: 1, year: 2022, title: 'Secret Santa 2022', status: 'done' });
      expect(mine.giftee?.name).toBeTruthy();
      expect(wishes.map((w: { title: string }) => w.title)).toEqual(['BOARD GAME', 'Scarf', 'Socks']);
      expect(inOlder.map((w: { title: string; shown: boolean }) => [w.title, w.shown])).toEqual([['BOARD GAME', true], ['Socks', true], ['Scarf', false]]);
      const group = (await c.groups.findOne({ _id: newer._id.toHexString() }))!;
      const edition = (await c.editions.findOne({ groupId: group._id }))!;
      const myId = group.members.find((m) => m.userId === userId)!.id;
      const santaId = Object.entries(edition.draw!.assignments).find(([, giftee]) => giftee === myId)![0];
      const [seen] = callAs(db, group.members.find((m) => m.id === santaId)!.userId!, [
        { path: 'claim.gifteeWishlist', input: { groupSlug: newerSlug, editionNumber: 1 } },
      ]);
      // Done before wishlists were kept (100): not today's list.
      expect(seen).toMatchObject({ saved: false, wishes: [] });
    });

    await test.step('edge wishes, a user in no group with and without wishes, a wishlist outside the group', async () => {
      const lists = data.groups.flatMap((g) => Object.entries(g.wishlists as Record<string, { description?: unknown }[]>));
      const [ownerId] = lists.find(([, items]) => items.some((item) => item.description === 'Something nice\nsecond line'))!;
      const wishes = await c.wishes.find({ ownerId }).toArray();
      expect(wishes.map((w) => w.title)).toEqual(expect.arrayContaining(['Something nice', 'x'.repeat(200), 'Line break', 'Kite', 'Not a link']));
      const linksOf = (title: string) => (wishes.find((w) => w.title === title) as { links?: unknown }).links;
      expect(linksOf('Kite')).toEqual([{ url: 'https://shop.example.com/kite?id=3' }]);
      expect(linksOf('Not a link')).toEqual([]);
      const loner = (await c.users.findOne({ email: edge.lonerEmail }))!;
      const [lonerGroups, lonerWishes] = callAs(db, loner._id.toHexString(), [{ path: 'account.groups' }, { path: 'wish.list' }]);
      expect(lonerGroups).toEqual([]);
      expect(lonerWishes.map((w: { title: string }) => w.title)).toEqual(['Outside wish']);
      expect(await c.users.countDocuments({ email: edge.unusedEmail })).toBe(0);
    });

    await test.step('re-run is a no-op', async () => {
      const before = await snapshot(db);
      expect((await runMigrations(db, { apply: true }))[0].status).toBe('applied before');
      const again = await migrateV1(db, { apply: true, source: { users: 'v1_users', groups: 'v1_groups' } });
      expect(again.written).toEqual({ users: 0, groups: 0, editions: 0, wishes: 0 });
      expect(await snapshot(db)).toEqual(before);
    });
  });
});

test('a migrated person signs in with the emailed code and finds their old group, draw and wishes', async ({ db, newClient, signIn, secrets }) => {
  const dan = await signIn('dan');
  const prefix = `v1e2e_${randomBytes(4).toString('hex')}_`;
  const source = { users: `${prefix}users`, groups: `${prefix}groups` };
  const [annEmail, bobEmail, ceeEmail] = ['ann', 'bob', 'cee'].map((name) => uniqueEmail(`mig-${name}`));
  secrets.push(annEmail, bobEmail, ceeEmail);
  const createdAt = new Date('2021-11-15T19:00:00Z');
  /** Created in this order before the group (the oldest duplicate keeps its id); random tails, so retries don't collide. */
  const id = (i: number) => new ObjectId((createdAt.getTime() / 1000 - 100 + i).toString(16) + randomBytes(8).toString('hex'));
  const [ann, annAgain, bob, cee, oldDan] = [id(0), id(1), id(2), id(3), id(4)];
  const users = [
    { _id: ann, name: 'Ann', email: annEmail, groups: [] },
    { _id: annAgain, name: 'Ann', email: ` ${annEmail.toUpperCase()}`, groups: [] },
    { _id: bob, name: 'Bob', email: bobEmail, groups: [] },
    { _id: cee, name: 'Cee', email: ceeEmail, groups: [] },
    { _id: oldDan, name: 'Dan', email: dan.email, groups: [] },
  ];
  const slug = `mig${randomBytes(4).toString('hex')}`;
  const hex = (oid: ObjectId) => oid.toHexString();
  const group = {
    _id: id(5), slug, name: 'Old family', creator: ann, options: {}, users: [ann, bob, cee, oldDan], createdAt: createdAt.getTime(), assignedAt: createdAt.getTime(),
    assignments: { [hex(ann)]: hex(bob), [hex(bob)]: hex(cee), [hex(cee)]: hex(oldDan), [hex(oldDan)]: hex(ann) },
    wishlists: { [hex(annAgain)]: [{ id: 'w1', title: 'Teapot', description: 'Blue' }], [hex(oldDan)]: [{ id: 'w2', title: 'Kite', description: '' }] },
    exclusions: [],
  };
  await db.raw.collection(source.users).insertMany(users);
  await db.raw.collection(source.groups).insertOne(group);
  try {
    const report = await migrateV1(db.raw, { apply: true, source });
    expect(report.invalid).toEqual([]);
    expect(report.conflicts.existingAccount.samples).toEqual([expect.objectContaining({ accountId: dan.id })]);

    const client = await newClient();
    const { code, token } = await requestSignIn(client.request, annEmail);
    secrets.push(code, token);
    expect((await signInWithCode(client.request, annEmail, code)).status()).toBe(200);
    const me = ok(await client.trpc.query('me.get'));
    expect(me).toMatchObject({ id: hex(ann), name: 'Ann', email: annEmail });
    expect(me.locale).toBeUndefined();
    const session = await (await client.request.get('/api/auth/get-session')).json();
    expect(session.user.locale ?? null, 'no account language: the browser decides').toBeNull();
    expect((await client.request.get(`/g/${slug}`)).status()).toBe(200);
    const home = ok(await client.trpc.query('group.get', { groupSlug: slug }));
    expect(home).toMatchObject({ name: 'Old family', me: { isOrganizer: true }, edition: { year: 2021, status: 'done' } });
    expect(ok(await client.trpc.query('draw.mine', { groupSlug: slug, editionNumber: 1 })).giftee).toEqual({ name: 'Bob' });
    expect(ok(await client.trpc.query('wish.list')).map((w) => [w.title, w.description])).toEqual([['Teapot', 'Blue']]);

    expect(ok(await dan.trpc.query('account.groups')).map((g) => g.slug)).toContain(slug);
    expect(ok(await dan.trpc.query('wish.list')).map((w) => w.title)).toEqual(['Kite']);
  } finally {
    await Promise.all([db.raw.collection(source.users).drop(), db.raw.collection(source.groups).drop()]);
  }
});

test('emails to an account without a language (migrated) use the group language', async ({ signIn, db }) => {
  const [ann, bob, cee] = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const group = await createGroup(ann, 'Familie');
  for (const [person, name] of [[bob, 'Bob'], [cee, 'Cee']] as const) await join(person, group, name);
  await db.groups.updateOne({ slug: group.slug }, { $set: { locale: 'nl' } });
  await db.users.updateOne({ _id: new ObjectId(bob.id) }, { $unset: { locale: true } });
  ok(await ann.trpc.mutate('draw.run', { groupSlug: group.slug, editionNumber: 1 }));
  const [mail] = await mailsTo(bob.email, 'namesDrawn');
  expect(mail.subject).toBe('Er is geloot in Familie!');
});
