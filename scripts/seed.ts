// pnpm seed: wipes the local dev database and fills it with demo data (README, Local development):
// one group per edition phase plus a past edition, wishlists, Dibs!, tips, questions and a Psst!.
// SEED_EMAIL (default you@example.test) organizes some groups and is a member of the others.
import { MongoClient, ObjectId } from 'mongodb';
import { addDays, todayIn, zonedInstant } from '../lib/local-date';
import type { Edition, EditionFields } from '../lib/schema/edition';
import type { Group } from '../lib/schema/group';
import type { Member } from '../lib/schema/member';
import { collections, newId } from '../lib/server/db';
import { drawEdition } from '../lib/server/draw/run';
import { runGiftDayTransitions } from '../lib/server/jobs/giftday';
import { randomToken } from '../lib/server/membership';
import { eur, people, wishlists } from './seed-people';
import { seedBetweenSantas } from './seed-santas';

const uri = process.env.MONGODB_URI ?? '';
const host = URL.parse(uri)?.hostname ?? '';
if (!uri.startsWith('mongodb://') || !['localhost', '127.0.0.1'].includes(host)) {
  console.error(`Refusing to seed: MONGODB_URI must point at localhost or 127.0.0.1 (host: "${host}").`);
  process.exit(1);
}

const TIME_ZONE = 'Europe/Brussels';
const DAY_MS = 24 * 60 * 60 * 1000;
const now = new Date();
const today = todayIn(TIME_ZONE, now);
const daysAgo = (days: number) => new Date(now.getTime() - days * DAY_MS);

const seedEmail = (process.env.SEED_EMAIL || 'you@example.test').trim().toLowerCase();
const persons = people(seedEmail);
const userIds = Object.fromEntries(persons.map((p) => [p.key, new ObjectId().toHexString()]));
const nameOf = (key: string) => persons.find((p) => p.key === key)!.name;

const client = await new MongoClient(uri).connect();
const raw = client.db(process.env.MONGODB_DB || 'givto_dev');
const db = collections(raw);

// Wipe: empty every collection (Better Auth's included), keeping the indexes the app created.
for (const { name } of await raw.listCollections({}, { nameOnly: true }).toArray()) {
  if (!name.startsWith('system.')) await raw.collection(name).deleteMany({});
}

await db.users.insertMany(
  persons.map((p) => ({
    _id: new ObjectId(userIds[p.key]),
    name: p.name,
    email: p.email,
    emailVerified: true,
    locale: p.locale,
    createdAt: daysAgo(400),
    updatedAt: daysAgo(400),
  }))
);
await db.wishes.insertMany(
  Object.entries(wishlists).flatMap(([key, wishes]) =>
    wishes.map((wish, position) => ({
      _id: newId(),
      ownerId: userIds[key],
      kind: 'wish' as const,
      reallyWant: false,
      links: [],
      ...wish,
      position,
      createdAt: daysAgo(30 - position),
      updatedAt: daysAgo(30 - position),
    }))
  )
);

type GroupSpec = { name: string; organizer: string; members: string[]; requested?: string[]; households?: string[][] };

const createGroup = async ({ name, organizer, members, requested = [], households = [] }: GroupSpec) => {
  const joinedAt = daysAgo(400);
  const member = (key: string, status: Member['status']): Member => ({
    id: newId(),
    userId: userIds[key],
    name: nameOf(key),
    role: key === organizer ? 'organizer' : 'member',
    status,
    ...(status === 'joined' && { joinedAt }),
    wishlistView: { includeNewWishes: true, hiddenWishIds: [] },
  });
  const all = [...[organizer, ...members].map((key) => member(key, 'joined')), ...requested.map((key) => member(key, 'requested'))];
  const idOf = (key: string) => all.find((m) => m.userId === userIds[key])!.id;
  const group: Group = {
    _id: newId(),
    slug: randomToken(9),
    name,
    locale: 'en',
    timeZone: TIME_ZONE,
    defaults: { exchangeMode: 'inPerson' },
    createdBy: userIds[organizer],
    members: all,
    exclusions: [],
    households: households.map((keys) => ({ id: newId(), memberIds: keys.map(idOf) })),
    joinLink: { token: randomToken(), revoked: false, requiresApproval: requested.length > 0, createdAt: joinedAt },
    createdAt: joinedAt,
    updatedAt: joinedAt,
  };
  await db.groups.insertOne(group);
  return group;
};

type EditionSpec = Partial<EditionFields> & Pick<Edition, 'year'> & Partial<Pick<Edition, 'number' | 'previousEditionId'>>;

/** Open (or draft), everyone joined in, like `group.create` and `edition.startNext`; `drawnAt` draws it. */
const createEdition = async (group: Group, spec: EditionSpec, { draft = false, drawnAt }: { draft?: boolean; drawnAt?: Date } = {}) => {
  const createdAt = drawnAt ? new Date(drawnAt.getTime() - 14 * DAY_MS) : daysAgo(2);
  const status = draft ? 'draft' : 'open';
  const edition: Edition = {
    _id: newId(),
    groupId: group._id,
    number: 1,
    title: `Secret Santa ${spec.year}`,
    exchangeMode: 'inPerson',
    avoidPreviousGiftees: false,
    ...spec,
    status,
    statusChangedAt: { [status]: createdAt },
    participants: group.members
      .filter((m) => m.status === 'joined')
      .map((m) => ({ memberId: m.id, participates: true, status: 'joined' as const, addedAt: createdAt })),
    reveal: { enabled: false },
    createdAt,
    updatedAt: createdAt,
  };
  await db.editions.insertOne(edition);
  if (drawnAt) await drawEdition(db, group, edition, drawnAt);
  return edition;
};

const giftDayIn = (days: number, time: string, place: string) => {
  const date = addDays(today, days);
  return { year: Number(date.slice(0, 4)), giftDay: { date, time, place } };
};
const lastYear = Number(today.slice(0, 4)) - 1;

const friends = await createGroup({ name: 'Old friends', organizer: 'you', members: ['hanne', 'jonas', 'ann'] });
const pastEdition = await createEdition(
  friends,
  { year: lastYear, giftDay: { date: `${lastYear}-12-20`, place: "Hanne's place" }, budget: eur(25) },
  { drawnAt: new Date(`${lastYear}-12-01T19:00:00Z`) }
);
await createEdition(
  friends,
  { number: 2, year: lastYear + 1, budget: eur(25), avoidPreviousGiftees: true, previousEditionId: pastEdition._id },
  { draft: true }
);

const bookClub = await createGroup({ name: 'Book club', organizer: 'you', members: ['femke', 'gilles', 'hanne'], requested: ['jonas'] });
await createEdition(bookClub, {
  ...giftDayIn(40, '19:30', 'Café De Kroon'),
  wishlistBy: addDays(today, 20),
  drawAt: zonedInstant(addDays(today, 14), '19:00', TIME_ZONE),
  budget: eur(20),
});

const family = await createGroup({
  name: 'Peeters family',
  organizer: 'ann',
  members: ['you', 'bram', 'chloe', 'dries', 'eva'],
  households: [['ann', 'bram']],
});
const familyEdition = await createEdition(
  family,
  { ...giftDayIn(30, '17:00', "Grandma's house"), wishlistBy: addDays(today, 10), budget: eur(30, 50), notes: 'Bring something homemade too!' },
  { drawnAt: daysAgo(5) }
);
await seedBetweenSantas(db, family, familyEdition._id, userIds.you, now);

const neighbours = await createGroup({ name: 'Neighbours', organizer: 'bram', members: ['you', 'chloe', 'dries', 'femke'] });
await createEdition(neighbours, { ...giftDayIn(0, '18:00', 'Street party tent'), budget: eur(15) }, { drawnAt: daysAgo(20) });

const work = await createGroup({ name: 'Work friends', organizer: 'you', members: ['gilles', 'hanne', 'jonas', 'eva'] });
const workEdition = await createEdition(work, { ...giftDayIn(-3, '12:30', 'Office kitchen'), budget: eur(20) }, { drawnAt: daysAgo(25) });

// drawn → giftday (today, with an unwrap order) or done (gift day passed), as the cron job does.
await runGiftDayTransitions(db, now);
await db.editions.updateOne({ _id: workEdition._id }, { $set: { reveal: { enabled: true, revealedAt: daysAgo(3) } } });
await client.close();

const base = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
const rows: [string, Group, string][] = [
  ['draft', friends, ''],
  ['open', bookClub, ''],
  ['drawn', family, ''],
  ['giftday', neighbours, ''],
  ['done', work, ''],
  ['past', friends, '/1'],
];
console.log(`\nSeeded ${raw.databaseName}:`);
for (const [phase, group, path] of rows) {
  const role = group.createdBy === userIds.you ? 'organizer' : 'member';
  console.log(`  ${phase.padEnd(8)} ${group.name.padEnd(15)} ${role.padEnd(10)} ${base}/g/${group.slug}${path}`);
}
console.log(`\nSign in with ${seedEmail}, code arrives at ${process.env.MAILGUN_API_BASE || 'http://localhost:3091'}`);
