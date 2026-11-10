// Pure core of migration 001 (ticket 58): old users and groups in, v2 documents and a report out.
import { ObjectId } from 'mongodb';
import { toExclusions, type KeepApartPair } from '../../lib/exclusions';
import type { Edition, EditionStatus } from '../../lib/schema/edition';
import type { Exclusion, Group } from '../../lib/schema/group';
import type { Member } from '../../lib/schema/member';
import type { Wish } from '../../lib/schema/wish';
import type { UserDoc } from '../../lib/server/db';
import { monthsBefore } from '../../lib/server/jobs/dates';
import {
  derivedId, derivedSlug, email, groupName, hexId, isSlug, maskEmail, personName, timestamp, titleKey, wishDescription, wishTitle, wishUrl,
} from './clean';

export const TIME_ZONE = 'Europe/Brussels';
export const FALLBACK_NAME = 'Anonymous';
export const FALLBACK_GROUP_NAME = 'Secret Santa';
/** An old group drawn this recently becomes a `drawn` edition, older ones `done` (58). */
const DRAWN_MONTHS = 2;
/** The wish router refuses more; migrated lists keep them all. */
const MAX_WISHES = 200;
const MAX_SAMPLES = 5;

/** master's `MongoUser` / `MongoGroup` (lib/api/data-sources/mongo.ts). Unvalidated in production, so unknown. */
export interface V1User {
  _id: ObjectId;
  name?: unknown;
  email?: unknown;
  groups?: unknown;
}

export interface V1Group {
  _id: ObjectId;
  slug?: unknown;
  name?: unknown;
  creator?: unknown;
  options?: unknown;
  users?: unknown;
  createdAt?: unknown;
  assignedAt?: unknown;
  assignments?: unknown;
  wishlists?: unknown;
  exclusions?: unknown;
}

/** What the v2 collections already hold (another sign-up, or an earlier, interrupted run). */
export interface Target {
  accountIds: Map<string, string>;
  slugOwners: Map<string, string>;
  wishCounts: Map<string, number>;
}

export interface Report {
  source: Record<string, number>;
  planned: Record<string, number>;
  conflicts: Record<string, { count: number; samples: unknown[] }>;
}

export interface Plan {
  users: UserDoc[];
  groups: Group[];
  editions: Edition[];
  wishes: Wish[];
  report: Report;
}

type V1Item = { title?: unknown; description?: unknown; url?: unknown };
interface WishSource {
  owner: string;
  groupId: string;
  createdAt: Date;
  items: V1Item[];
}

const byId = <T extends { _id: ObjectId }>(docs: T[]) => docs.toSorted((a, b) => a._id.toHexString().localeCompare(b._id.toHexString()));
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const short = (value: unknown) => (value === undefined || value === null ? null : String(value).slice(0, 80));
const yearOf = (date: Date) => Number(new Intl.DateTimeFormat('en', { timeZone: TIME_ZONE, year: 'numeric' }).format(date));

export const planV1ToV2 = (v1: { users: V1User[]; groups: V1Group[] }, target: Target, now: Date): Plan => {
  const conflicts: Report['conflicts'] = {};
  const note = (kind: string, sample: unknown) => {
    const entry = (conflicts[kind] ??= { count: 0, samples: [] });
    entry.count++;
    if (entry.samples.length < MAX_SAMPLES) entry.samples.push(sample);
  };

  // Accounts: one per normalized email; duplicates merge into the oldest (or an existing v2 account).
  const byEmail = new Map<string, V1User[]>();
  const invalidEmail = new Map<string, V1User>();
  for (const user of byId(v1.users)) {
    const address = email(user.email);
    if (!address) {
      invalidEmail.set(user._id.toHexString(), user);
      note('invalidEmail', { user: user._id.toHexString(), email: maskEmail(user.email) });
    } else byEmail.set(address, [...(byEmail.get(address) ?? []), user]);
  }
  const accountOf = new Map<string, string>();
  const accountName = new Map<string, string | null>();
  const users: UserDoc[] = [];
  for (const [address, dups] of byEmail) {
    const ids = dups.map((user) => user._id.toHexString());
    const accountId = target.accountIds.get(address) ?? ids[0];
    const name = dups.map((user) => personName(user.name)).find(Boolean) ?? null;
    if (dups.length > 1) note('mergedDuplicateEmail', { email: maskEmail(address), kept: accountId, merged: ids.filter((id) => id !== accountId) });
    if (!name) note('nameFallback', { user: accountId, name: short(dups[0].name) });
    for (const id of ids) accountOf.set(id, accountId);
    accountName.set(accountId, name);
    if (accountId !== ids[0]) {
      note('existingAccount', { email: maskEmail(address), oldIds: ids, accountId });
      continue;
    }
    users.push({ _id: new ObjectId(accountId), name: name ?? '', email: address, emailVerified: true, createdAt: dups[0]._id.getTimestamp(), updatedAt: now });
  }

  const slugOwners = new Map(target.slugOwners);
  const drawnSince = monthsBefore(now, DRAWN_MONTHS);
  const groups: Group[] = [];
  const editions: Edition[] = [];
  const wishSources: WishSource[] = [];

  for (const old of byId(v1.groups)) {
    const groupId = old._id.toHexString();
    const createdAt = timestamp(old.createdAt, now) ?? old._id.getTimestamp();
    if (!timestamp(old.createdAt, now)) note('timestampFallback', { group: groupId, field: 'createdAt', value: short(old.createdAt) });

    // People: the creator and `users`; deleted users drop out, invalid emails become managed members.
    const memberIdOf = new Map<string, string>();
    const missing = new Set<string>();
    const members: Member[] = [];
    for (const ref of [old.creator, ...asArray(old.users)]) {
      const oldId = hexId(ref) ?? short(ref) ?? 'none';
      const accountId = accountOf.get(oldId);
      const key = accountId ?? (invalidEmail.has(oldId) ? oldId : null);
      if (!key) {
        if (!missing.has(oldId)) note('missingUser', { group: groupId, user: oldId });
        missing.add(oldId);
        continue;
      }
      const id = derivedId('member', groupId, key);
      memberIdOf.set(oldId, id);
      if (members.some((m) => m.id === id)) continue;
      const name = accountId ? accountName.get(accountId) : personName(invalidEmail.get(oldId)!.name);
      members.push({
        id,
        ...(accountId && { userId: accountId }),
        name: name ?? FALLBACK_NAME,
        role: 'member',
        status: 'joined',
        joinedAt: createdAt,
        wishlistView: { includeNewWishes: true, hiddenWishIds: [] },
      });
    }

    const creatorMemberId = memberIdOf.get(hexId(old.creator) ?? '');
    const organizer = members.find((m) => m.id === creatorMemberId && m.userId) ?? members.find((m) => m.userId);

    // Wishes are the person's, so they move to the personal list even from groups that don't make it.
    for (const [key, items] of Object.entries(isRecord(old.wishlists) ? old.wishlists : {})) {
      const oldId = hexId(key) ?? key;
      const owner = accountOf.get(oldId) ?? (organizer && invalidEmail.has(oldId) ? memberIdOf.get(oldId) : undefined);
      const list = asArray(items).filter(isRecord);
      if (!owner) note('wishlistOfDeletedUser', { group: groupId, user: short(key), items: list.length });
      else {
        if (!memberIdOf.has(oldId)) note('wishlistOutsideGroup', { group: groupId, user: owner });
        wishSources.push({ owner, groupId, createdAt, items: list });
      }
    }

    if (!organizer) {
      note('groupWithoutAccounts', { group: groupId, slug: short(old.slug) });
      continue;
    }
    if (organizer.id !== creatorMemberId) note('missingCreator', { group: groupId, creator: short(hexId(old.creator) ?? old.creator), organizer: organizer.userId });
    const people = members.map((m): Member =>
      m.id === organizer.id ? { ...m, role: 'organizer' } : m.userId ? m : { ...m, managedBy: organizer.id }
    );

    // The oldest group keeps a shared slug: master's /g/<slug> did findOne, which returns it first.
    const keepSlug = isSlug(old.slug) && (slugOwners.get(old.slug) ?? groupId) === groupId;
    const slug = keepSlug ? (old.slug as string) : freeSlug(groupId, slugOwners);
    if (!keepSlug) note(isSlug(old.slug) ? 'duplicateSlug' : 'invalidSlug', { group: groupId, slug: short(old.slug), newSlug: slug });
    slugOwners.set(slug, groupId);

    const name = groupName(old.name);
    if (!name) note('groupNameFallback', { group: groupId, name: short(old.name) });

    const assignments: Record<string, string> = {};
    for (const [santa, giftee] of Object.entries(isRecord(old.assignments) ? old.assignments : {})) {
      const from = memberIdOf.get(hexId(santa) ?? '');
      const to = memberIdOf.get(hexId(giftee) ?? '');
      if (!from || !to || from === to || from in assignments || Object.values(assignments).includes(to)) {
        const reason = !from || !to ? 'person missing' : from === to ? 'self after merge' : 'twice after merge';
        note('assignmentDropped', { group: groupId, santa, giftee: short(giftee), reason });
      } else assignments[from] = to;
    }

    const exclusions = toV2Exclusions(old.exclusions, memberIdOf, (rule) => note('exclusionDropped', { group: groupId, rule }));

    const hasDraw = Object.keys(assignments).length > 0;
    const assignedAt = old.assignedAt === null || old.assignedAt === undefined ? null : timestamp(old.assignedAt, now);
    if (hasDraw && !assignedAt && old.assignedAt != null) note('timestampFallback', { group: groupId, field: 'assignedAt', value: short(old.assignedAt) });
    const drawnAt = assignedAt ?? createdAt;
    const status: EditionStatus = hasDraw ? (drawnAt >= drawnSince ? 'drawn' : 'done') : createdAt >= drawnSince ? 'open' : 'done';
    const inDraw = new Set([...Object.keys(assignments), ...Object.values(assignments)]);
    for (const m of people) if (hasDraw && !inDraw.has(m.id)) note('notInDraw', { group: groupId, member: m.userId ?? m.id });
    const year = yearOf(createdAt);

    groups.push({
      _id: groupId,
      slug,
      name: name ?? FALLBACK_GROUP_NAME,
      locale: 'en',
      defaults: { timeZone: TIME_ZONE, exchangeMode: 'inPerson' },
      createdBy: organizer.userId!,
      members: people,
      exclusions,
      households: [],
      createdAt,
      updatedAt: now,
    });
    editions.push({
      _id: derivedId('edition', groupId, '1'),
      groupId,
      number: 1,
      year,
      title: `Secret Santa ${year}`,
      timeZone: TIME_ZONE,
      exchangeMode: 'inPerson',
      avoidPreviousGiftees: false,
      status,
      statusChangedAt: { open: createdAt, ...(hasDraw && { drawn: drawnAt }), ...(status === 'done' && { done: now }) },
      participants: people.map((m) => ({ memberId: m.id, participates: !hasDraw || inDraw.has(m.id), status: 'joined', addedAt: createdAt })),
      ...(hasDraw && { draw: { assignments, drawnAt, history: [] } }),
      reveal: { enabled: false },
      createdAt,
      updatedAt: now,
    });
  }

  const { wishes, wishIdsOf, shownIn, merged } = planWishes(wishSources, target, now, note);
  // Each group keeps seeing only what was on its old list: the rest of the merged list is hidden there.
  const withHidden = groups.map((group) => ({
    ...group,
    members: group.members.map((m) => {
      const owner = m.userId ?? m.id;
      const shown = shownIn.get(`${group._id}:${owner}`) ?? new Set<string>();
      const hiddenWishIds = (wishIdsOf.get(owner) ?? []).filter((id) => !shown.has(id));
      return { ...m, wishlistView: { includeNewWishes: true, hiddenWishIds } };
    }),
  }));

  const countStatus = (status: EditionStatus) => editions.filter((e) => e.status === status).length;
  const planned = {
    users: users.length,
    groups: groups.length,
    editionsDone: countStatus('done'),
    editionsDrawn: countStatus('drawn'),
    editionsOpen: countStatus('open'),
    members: groups.reduce((sum, g) => sum + g.members.length, 0),
    managedMembers: groups.reduce((sum, g) => sum + g.members.filter((m) => m.managedBy).length, 0),
    draws: editions.filter((e) => e.draw).length,
    assignments: editions.reduce((sum, e) => sum + Object.keys(e.draw?.assignments ?? {}).length, 0),
    exclusions: groups.reduce((sum, g) => sum + g.exclusions.length, 0),
    wishes: wishes.length,
    wishDuplicatesMerged: merged,
  };
  for (const [owner, ids] of wishIdsOf) if (ids.length > MAX_WISHES) note('tooManyWishes', { owner, count: ids.length });
  return { users, groups: withHidden, editions, wishes, report: { source: {}, planned, conflicts } };
};

/** Old exclusions (user ids, both ways in master's draw) → v2 standing exclusions between member ids. */
const toV2Exclusions = (rules: unknown, memberIdOf: Map<string, string>, dropped: (rule: unknown) => void): Exclusion[] => {
  const pairs = asArray(rules).flatMap((rule): KeepApartPair[] => {
    const from = isRecord(rule) ? memberIdOf.get(hexId(rule.from) ?? '') : undefined;
    const to = isRecord(rule) ? memberIdOf.get(hexId(rule.to) ?? '') : undefined;
    if (from && to && from !== to) return [[from, to]];
    dropped(isRecord(rule) ? { from: short(rule.from), to: short(rule.to) } : short(rule));
    return [];
  });
  return [...new Map(toExclusions(pairs).map((e): [string, Exclusion] => [`${e.from}>${e.to}`, e])).values()];
};

/** One cleaned old wish list item → a v2 wish document. */
const toV2Wish = ({ description, url, now, ...wish }: Pick<Wish, '_id' | 'ownerId' | 'title' | 'position' | 'createdAt'> & { description: string | null; url: string | null; now: Date }): Wish => ({
  ...wish,
  kind: 'wish',
  ...(description && { description }),
  links: url ? [{ url }] : [],
  reallyWant: false,
  updatedAt: now,
});

const freeSlug = (groupId: string, taken: Map<string, string>) => {
  const attempt = (n: number): string => (taken.has(derivedSlug(groupId, n)) ? attempt(n + 1) : derivedSlug(groupId, n));
  return attempt(0);
};

/** One personal list per owner: most recent group first, old order within a group, same title once. */
const planWishes = (sources: WishSource[], target: Target, now: Date, note: (kind: string, sample: unknown) => void) => {
  const wishes: Wish[] = [];
  const wishIdsOf = new Map<string, string[]>();
  const shownIn = new Map<string, Set<string>>();
  const idByKey = new Map<string, string>();
  let merged = 0;
  const ordered = sources.toSorted((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.groupId.localeCompare(a.groupId));
  for (const { owner, groupId, createdAt, items } of ordered) {
    const shown = shownIn.get(`${groupId}:${owner}`) ?? new Set<string>();
    shownIn.set(`${groupId}:${owner}`, shown);
    for (const item of items) {
      const description = wishDescription(item.description);
      const title = wishTitle(item.title) ?? wishTitle(description?.split('\n')[0]);
      if (!title) {
        note('wishDropped', { group: groupId, owner, title: short(item.title) });
        continue;
      }
      const longer = [[item.title, 200], [item.description, 2000]] as const;
      if (longer.some(([text, max]) => typeof text === 'string' && text.trim().length > max)) note('wishTextShortened', { group: groupId, owner, title });
      const key = `${owner}:${titleKey(title)}`;
      const existing = idByKey.get(key);
      if (existing) merged++;
      else {
        const ids = wishIdsOf.get(owner) ?? [];
        const _id = derivedId('wish', key);
        wishes.push(toV2Wish({ _id, ownerId: owner, title, description, url: wishUrl(item.url), position: (target.wishCounts.get(owner) ?? 0) + ids.length, createdAt, now }));
        wishIdsOf.set(owner, [...ids, _id]);
        idByKey.set(key, _id);
      }
      shown.add(idByKey.get(key)!);
    }
  }
  return { wishes, wishIdsOf, shownIn, merged };
};
