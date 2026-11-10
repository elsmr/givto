// Shared by the s7 notification specs: groups and editions seeded relative to today (the jobs run
// at real time through the cron endpoint), and mail lookups scoped to the test's own people.
import { randomBytes } from 'node:crypto';
import { newId } from '@/lib/server/db';
import type { Edition } from '@/lib/schema/edition';
import type { Group } from '@/lib/schema/group';
import type { Member } from '@/lib/schema/member';
import { expect, mailsTo, runCron, type User } from '../fixtures';

export const DAY = 24 * 3600_000;

/** Runs a cron job and returns its result (counts cover the whole database: assert on own data instead). */
export const run = async (job: string) => {
  const { status, body } = await runCron(job);
  expect(status, JSON.stringify(body)).toBe(200);
  return body.result;
};

/** Mails of one kind to `user`, optionally only those mentioning `group`. */
export const mails = async (user: Pick<User, 'email'>, kind: string, group?: string) =>
  (await mailsTo(user.email, kind)).filter((mail) => !group || mail.text.includes(group));

/**
 * The number of such mails, once it settles at `count`: a parallel test's cron run may be the
 * one sending ours, finishing a moment after our own run returned.
 */
export const expectMails = (user: Pick<User, 'email'>, kind: string, count: number, group?: string) =>
  expect.poll(async () => (await mails(user, kind, group)).length, { message: `${kind} mails to ${user.email}` }).toBe(count);

/** YYYY-MM-DD in `timeZone`, `offsetDays` from now. */
export const today = (timeZone: string, offsetDays = 0) =>
  new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date(Date.now() + offsetDays * DAY));

export const member = (user: User | null, name: string, extra: Partial<Member> = {}): Member => ({
  id: newId(),
  ...(user && { userId: user.id }),
  name,
  role: 'member',
  status: 'joined',
  joinedAt: new Date(),
  wishlistView: { includeNewWishes: true, hiddenWishIds: [] },
  ...extra,
});

export const groupDoc = (organizer: User, name: string, members: Member[], extra: Partial<Group> = {}): Group => ({
  _id: newId(),
  slug: `s7${randomBytes(5).toString('hex')}`,
  name,
  locale: 'en',
  timeZone: 'Europe/Brussels',
  defaults: { exchangeMode: 'inPerson' },
  createdBy: organizer.id,
  members,
  exclusions: [],
  households: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...extra,
});

export const editionDoc = (group: Group, number: number, status: Edition['status'], people: Member[], extra: Partial<Edition> = {}): Edition => ({
  _id: newId(),
  groupId: group._id,
  number,
  year: 2026,
  title: `Secret Santa ${number}`,
  exchangeMode: 'inPerson',
  avoidPreviousGiftees: false,
  status,
  statusChangedAt: {},
  reveal: { enabled: false },
  participants: people.map((p) => ({ memberId: p.id, participates: true, status: 'joined', addedAt: new Date() })),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...extra,
});

export const drawOf = (pairs: [Pick<Member, 'id'>, Pick<Member, 'id'>][]): NonNullable<Edition['draw']> => ({
  assignments: Object.fromEntries(pairs.map(([santa, giftee]) => [santa.id, giftee.id])),
  drawnAt: new Date(),
  history: [],
});

export const circle = (people: Member[]) => drawOf(people.map((p, i) => [p, people[(i + 1) % people.length]]));
