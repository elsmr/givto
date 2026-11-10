import { MongoClient, ObjectId, type Db } from 'mongodb';
import type { Claim } from '../schema/claim';
import type { Edition } from '../schema/edition';
import type { Group } from '../schema/group';
import type { Invite } from '../schema/invite';
import type { EmailSuppression, SentNotification, WishlistNotification } from '../schema/notification';
import type { Nudge } from '../schema/nudge';
import type { Question } from '../schema/question';
import type { RateLimitCounter } from '../schema/rate-limit';
import type { Tip } from '../schema/tip';
import type { User } from '../schema/user';
import type { Wish } from '../schema/wish';
import { retention } from '../privacy';
import { requireEnv } from './env';

/** Better Auth owns `users` and keys it by ObjectId; every other collection uses `newId()` strings. */
export type UserDoc = User & { _id: ObjectId };

export const newId = (): string => new ObjectId().toHexString();

const DAY = 24 * 60 * 60;

export const collections = (db: Db) => ({
  users: db.collection<UserDoc>('users'),
  groups: db.collection<Group>('groups'),
  editions: db.collection<Edition>('editions'),
  wishes: db.collection<Wish>('wishes'),
  claims: db.collection<Claim>('claims'),
  tips: db.collection<Tip>('tips'),
  questions: db.collection<Question>('questions'),
  nudges: db.collection<Nudge>('nudges'),
  invites: db.collection<Invite>('invites'),
  sentNotifications: db.collection<SentNotification>('sentNotifications'),
  wishlistNotifications: db.collection<WishlistNotification>('wishlistNotifications'),
  emailSuppressions: db.collection<EmailSuppression>('emailSuppressions'),
  rateLimits: db.collection<RateLimitCounter>('rateLimits'),
});
export type Collections = ReturnType<typeof collections>;

// createIndex is a no-op when the same index exists, so this runs on every cold start.
// Better Auth's Mongo adapter doesn't create indexes for its own collections, so we do.
const createIndexes = async (db: Db, c: Collections) => {
  await Promise.all([
    c.users.createIndex({ email: 1 }, { unique: true }),
    db.collection('sessions').createIndex({ token: 1 }, { unique: true }),
    db.collection('sessions').createIndex({ userId: 1 }),
    db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection('accounts').createIndex({ userId: 1 }),
    db.collection('verifications').createIndex({ identifier: 1 }),
    db.collection('verifications').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection('passkeys').createIndex({ credentialID: 1 }, { unique: true }),
    db.collection('passkeys').createIndex({ userId: 1 }),
    c.groups.createIndex({ slug: 1 }, { unique: true }),
    c.groups.createIndex({ 'members.userId': 1 }),
    c.groups.createIndex(
      { 'joinLink.token': 1 },
      { unique: true, partialFilterExpression: { 'joinLink.token': { $exists: true } } }
    ),
    c.editions.createIndex({ groupId: 1, number: 1 }, { unique: true }),
    c.editions.createIndex({ status: 1, drawAt: 1 }),
    c.editions.createIndex({ drawNoticesPendingAt: 1 }, { sparse: true }),
    c.wishes.createIndex({ ownerId: 1, position: 1 }),
    c.claims.createIndex({ wishId: 1 }, { unique: true }),
    c.claims.createIndex({ ownerId: 1 }),
    c.claims.createIndex({ editionId: 1 }),
    c.tips.createIndex({ editionId: 1, aboutMemberId: 1 }),
    c.tips.createIndex({ editionId: 1, authorMemberId: 1 }),
    c.questions.createIndex({ editionId: 1, gifteeMemberId: 1 }),
    c.questions.createIndex({ editionId: 1, askerMemberId: 1 }),
    c.nudges.createIndex({ editionId: 1, santaMemberId: 1, createdAt: -1 }),
    c.nudges.createIndex({ sendAfter: 1 }),
    c.nudges.createIndex({ createdAt: 1 }, { expireAfterSeconds: 90 * DAY }),
    c.invites.createIndex({ tokenHash: 1 }, { unique: true }),
    c.invites.createIndex({ groupId: 1 }),
    c.invites.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    c.sentNotifications.createIndex({ sentAt: 1 }, { expireAfterSeconds: retention.sentEmailsDays * DAY }),
    c.wishlistNotifications.createIndex({ editionId: 1, gifteeMemberId: 1 }, { unique: true }),
    c.wishlistNotifications.createIndex({ notifyAfter: 1 }, { sparse: true }),
    c.rateLimits.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]);
};

// One client per process; kept on globalThis so dev hot reloads don't open new pools.
const globalForMongo = globalThis as { givtoMongoClient?: MongoClient };

/** The driver connects on first use, so Better Auth can take the Db synchronously. */
export const getMongoClient = (): MongoClient =>
  (globalForMongo.givtoMongoClient ??= new MongoClient(requireEnv('MONGODB_URI')));

export const getMongoDb = (): Db => getMongoClient().db(requireEnv('MONGODB_DB'));

let ready: Promise<Collections> | null = null;

/** Typed collections, after the connection and indexes are up. A failure is retried on the next call. */
export const getDb = (): Promise<Collections> => {
  ready ??= (async () => {
    const db = getMongoDb();
    const c = collections(db);
    await createIndexes(db, c);
    return c;
  })().catch((error: unknown) => {
    ready = null;
    throw error;
  });
  return ready;
};
