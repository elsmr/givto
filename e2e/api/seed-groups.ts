// Groups, editions and draws inserted straight into Mongo for the S2 and S3 specs (states the
// API can't reach quickly: several editions, managed members, chosen draws). Unique ids and slugs.
import { randomBytes } from 'node:crypto';
import { newId } from '@/lib/server/db';
import type { Edition } from '@/lib/schema/edition';
import type { Group } from '@/lib/schema/group';
import type { Member } from '@/lib/schema/member';
import type { TestDb, User } from '../fixtures';

export const newMember = (user: User | null, name: string, extra: Partial<Member> = {}): Member => ({
  id: newId(),
  ...(user && { userId: user.id }),
  name,
  role: 'member',
  status: 'joined',
  wishlistView: { shownWishIds: [] },
  ...extra,
});

export const seedGroup = async (db: TestDb, prefix: string, createdBy: User, members: Member[]): Promise<Group> => {
  const now = new Date();
  const group: Group = {
    _id: newId(),
    slug: `${prefix}${randomBytes(4).toString('hex')}`,
    name: 'Family',
    locale: 'en',
    timeZone: 'Europe/Brussels',
    createdBy: createdBy.id,
    members,
    households: [],
    createdAt: now,
    updatedAt: now,
  };
  await db.groups.insertOne(group);
  return group;
};

/** Santa member → giftee member, as member pairs. */
export const assignments = (pairs: [Member, Member][]) => Object.fromEntries(pairs.map(([santa, giftee]) => [santa.id, giftee.id]));

/** An edition without dates. `inDraw`: who participates (default everyone); `draw`: the assignments. */
export const seedEdition = async (
  db: TestDb,
  group: Group,
  number: number,
  status: Edition['status'],
  { inDraw = group.members, draw, budget }: { inDraw?: Member[]; draw?: Record<string, string>; budget?: Edition['budget'] } = {}
): Promise<Edition> => {
  const now = new Date();
  const edition: Edition = {
    _id: newId(),
    groupId: group._id,
    number,
    year: 2025 + number,
    title: `Secret Santa ${2025 + number}`,
    exchangeMode: 'inPerson',
    ...(budget && { budget }),
    avoidPreviousGiftees: false,
    status,
    statusChangedAt: {},
    participants: group.members.map((m) => ({ memberId: m.id, participates: inDraw.includes(m), status: 'joined', addedAt: now })),
    ...(draw && { draw: { assignments: draw, drawnAt: now, history: [] } }),
    reveal: { enabled: false },
    createdAt: now,
    updatedAt: now,
  };
  await db.editions.insertOne(edition);
  return edition;
};
