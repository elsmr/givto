// Helpers for the S4 specs (draw & settings): Ann's groups, joining, reading the stored draw.
import type { Group } from '@/lib/schema/group';
import { expect, ok, type TestDb, type TrpcError, type User } from '../fixtures';

const TZ = 'Europe/Brussels';

export const codeOf = (result: { error?: TrpcError }) => result.error?.data.appCode;

export const groupOf = async (db: TestDb, slug: string) => (await db.groups.findOne({ slug }))!;

export const editionOf = async (db: TestDb, slug: string, number: number) =>
  (await db.editions.findOne({ groupId: (await groupOf(db, slug))._id, number }))!;

export const memberIdOf = async (db: TestDb, slug: string, user: User) =>
  (await groupOf(db, slug)).members.find((m) => m.userId === user.id)!.id;

export const createGroup = async (ann: User, name: string, giftDay = { date: '2099-12-24', time: '18:00', place: 'Grandma’s' }) =>
  ok(await ann.trpc.mutate('group.create', { name, organizerName: 'Ann', timeZone: TZ, giftDay, exchangeMode: 'both' }));

export const join = async (person: User, { slug, joinToken }: { slug: string; joinToken: string }, name: string) =>
  ok(await person.trpc.mutate('join.accept', { groupSlug: slug, token: joinToken, name }));

type Rule = { from: string; to: string };

/** A valid draw: a permutation of exactly `ids`, nobody themselves, no rule broken. */
export const expectValidDraw = (assignments: Record<string, string> | undefined, ids: string[], exclusions: Rule[] = []) => {
  expect(Object.keys(assignments!).toSorted()).toEqual(ids.toSorted());
  expect(Object.values(assignments!).toSorted()).toEqual(ids.toSorted());
  for (const [santa, giftee] of Object.entries(assignments!)) expect(santa).not.toBe(giftee);
  for (const { from, to } of exclusions) expect(assignments![from], `${from} drew ${to}`).not.toBe(to);
};

/** The group's keep-apart rules as directed exclusions. */
export const rulesOf = (group: Group): Rule[] =>
  group.households.flatMap(({ memberIds }) => memberIds.flatMap((from) => memberIds.filter((to) => to !== from).map((to) => ({ from, to }))));
