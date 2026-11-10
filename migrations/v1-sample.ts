// Synthetic production data in master's format (lib/api/data-sources/mongo.ts) for rehearsing
// migration 001: realistic groups plus the edge cases the old app (no validation, no unique
// indexes) could leave behind. Seeded, so the same options give the same data.
import { ObjectId } from 'mongodb';
import type { V1Group, V1User } from './v1-to-v2/plan';

const DAY = 24 * 60 * 60 * 1000;
/** master's slug and token alphabet (nanoid-dictionary/nolookalikes). */
const ALPHABET = '346789ABCDEFGHJKLMNPQRTUVWXYabcdefghijkmnopqrstwxyz';
const FIRST = ['Ann', 'Bram', 'Charlotte', 'Daan', 'Emma', 'Femke', 'Gert', 'Hanna', 'Ilse', 'Jonas', 'Kato', 'Lars', 'Marie', 'Noah', 'Olivia', 'Pieter', 'Ruben', 'Sara', 'Tom', 'Wout'];
const LAST = ['Peeters', 'Janssens', 'Maes', 'Jacobs', 'Mertens', 'Willems', 'Claes', 'Goossens', 'Wouters', 'De Smet', 'Van den Berg', 'Smith'];
const DOMAINS = ['example.com', 'example.org', 'example.net'];
const GROUPS = ['Family', 'Familie Peeters', 'Work', 'Friends', 'Book club', 'Cousins', 'Neighbours', 'Kerst'];
const GIFTS = ['Board game', 'Socks', 'Scarf', 'A good book', 'Chocolate', 'Plant', 'Headphones', 'Puzzle', 'Candle', 'Gin', 'Cookbook', 'Mug', 'Gloves', 'Vinyl record', 'Cinema tickets', 'Tea', 'Notebook', 'Lego', 'Bike lights', 'Perfume'];
const DESCRIPTIONS = ['', '', 'Size M please', 'Blue or green', 'https://www.example.com/item/123', 'Anything by this author\nbut not the first one', '<b>bold</b> <img src=x onerror=alert(1)>'];

/** Values the spec checks by name. */
export const edge = {
  duplicateEmail: 'dup.case@example.com',
  exactDuplicateEmail: 'dup.exact@example.com',
  invalidEmail: 'not-an-email',
  lonerEmail: 'loner@example.com',
  unusedEmail: 'unused@example.com',
  sharedSlug: 'Fam2020xy',
  customSlug: 'family-2021',
  invalidSlug: 'my family',
  recentDrawnSlug: 'Recent7dr',
  recentOpenSlug: 'Recent7op',
};

const mulberry32 = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const generateV1 = ({ seed = 58, users: userCount = 60, groups: groupCount = 24, now = new Date() } = {}) => {
  const random = mulberry32(seed);
  const int = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
  const pick = <T>(list: readonly T[]) => list[int(0, list.length - 1)];
  const chance = (p: number) => random() < p;
  const token = (length: number) => Array.from({ length }, () => pick([...ALPHABET])).join('');
  const ago = (days: number) => new Date(now.getTime() - days * DAY);
  const between = (from: Date, to: Date) => new Date(from.getTime() + random() * (to.getTime() - from.getTime()));
  const objectId = (at: Date) =>
    new ObjectId(Math.floor(at.getTime() / 1000).toString(16).padStart(8, '0') + Array.from({ length: 16 }, () => int(0, 15).toString(16)).join(''));
  const start = new Date('2019-10-01T00:00:00Z');
  const shuffle = <T>(list: T[]) => list.map((item) => ({ item, key: random() })).sort((a, b) => a.key - b.key).map(({ item }) => item);

  const user = (name: string | undefined, email: string, createdAt = between(start, ago(400))): V1User & { groups: ObjectId[] } => ({
    _id: objectId(createdAt),
    ...(name !== undefined && { name }),
    email,
    groups: [],
  });
  const people = Array.from({ length: userCount }, (_, i) => {
    const [first, last] = [pick(FIRST), pick(LAST)];
    return user(`${first} ${last}`, `${first}.${last.replaceAll(' ', '')}.${i}@${pick(DOMAINS)}`.toLowerCase(), between(start, ago(90)));
  });
  const [dupA, dupB, dupC] = [user('Dana Duplicate', ' Dup.Case@Example.com'), user('Dana D.', edge.duplicateEmail), user('', 'DUP.CASE@EXAMPLE.COM ')];
  const [exact1, exact2] = [user('Eddy Exact', edge.exactDuplicateEmail), user('Eddy Exact', edge.exactDuplicateEmail)];
  const invalid = user('Ivo Invalid', edge.invalidEmail);
  const loner = user('Lona Loner', edge.lonerEmail);
  const oddNames = [undefined, 'Anonymous', 'ann@home', 'www.example.com', 'Bartholomew '.repeat(6), 'Tab\tName\nNewline'].map((name, i) => user(name, `odd.name.${i}@example.com`));
  const [gone1, gone2] = [objectId(ago(900)), objectId(ago(800))];

  const wishlist = () => Array.from({ length: int(0, 6) }, () => ({ id: token(21), title: pick(GIFTS), description: pick(DESCRIPTIONS) }));
  /** master's assignSecretSantas: a random derangement, exclusions both ways. */
  const draw = (ids: string[], exclusions: { from: string; to: string }[]) => {
    const blocked = (a: string, b: string) => a === b || exclusions.some((e) => (e.from === a && e.to === b) || (e.from === b && e.to === a));
    for (let attempt = 0; attempt < 1000; attempt++) {
      const giftees = shuffle(ids);
      if (ids.every((id, i) => !blocked(id, giftees[i]))) return Object.fromEntries(ids.map((id, i) => [id, giftees[i]]));
    }
    return Object.fromEntries(ids.map((id, i) => [id, ids[(i + 1) % ids.length]]));
  };
  const group = (members: V1User[], createdAt: Date, extra: Partial<V1Group> = {}): V1Group => {
    const ids = members.map((m) => m._id.toHexString());
    const exclusions = ids.length >= 5 && chance(0.4) ? [{ from: ids[1], to: ids[2] }] : [];
    const name = chance(0.75) ? { name: `${pick(GROUPS)} ${createdAt.getUTCFullYear()}` } : {};
    return {
      _id: objectId(createdAt),
      slug: token(8),
      ...name,
      creator: members[0]._id,
      options: {},
      users: members.map((m) => m._id),
      createdAt: createdAt.getTime(),
      assignedAt: createdAt.getTime(),
      assignments: draw(ids, exclusions),
      wishlists: Object.fromEntries(members.filter(() => chance(0.75)).map((m) => [m._id.toHexString(), wishlist()])),
      exclusions,
      ...extra,
    };
  };
  const someone = () => pick(people);
  const crowd = (n: number) => shuffle(people).slice(0, n);
  const id = (u: V1User) => u._id.toHexString();

  const regular = Array.from({ length: groupCount }, () => group(crowd(int(3, 9)), between(start, ago(70))));
  const oddTimes: unknown[] = [Math.floor(Number(regular[0].createdAt) / 1000), new Date(Number(regular[1].createdAt)).toISOString(), new Date(Number(regular[2].createdAt)), undefined, ago(-30).getTime()];
  const regularOdd = regular.map((g, i) => (i < oddTimes.length ? { ...g, createdAt: oddTimes[i], ...(i === 0 && { assignedAt: String(g.assignedAt) }) } : g));
  const [p1, p2, p3, p4] = crowd(4);
  const lateAdds = group(crowd(3), ago(500));
  const edgeGroups: V1Group[] = [
    group([dupA, p1, p2, dupB], new Date('2021-11-20T10:00:00Z'), {
      wishlists: { [id(dupA)]: [{ id: token(21), title: 'Board game', description: '' }], [id(dupB)]: [{ id: token(21), title: 'board game ', description: 'Catan' }, { id: token(21), title: 'Socks', description: '' }] },
    }),
    group([p3, dupC, p4], new Date('2022-11-20T10:00:00Z'), { wishlists: { [id(dupC)]: [{ id: token(21), title: 'BOARD GAME', description: '' }, { id: token(21), title: 'Scarf', description: '' }] } }),
    group([exact1, someone(), someone(), someone()], ago(700)),
    group([exact2, someone(), someone()], ago(650)),
    group([invalid, someone(), someone(), someone()], ago(600), { wishlists: { [id(invalid)]: [{ id: token(21), title: 'Coffee', description: '' }] } }),
    group([oddNames[0], ...oddNames.slice(1)], ago(550), { name: 'Family www.fam.com', slug: edge.customSlug }),
    { ...lateAdds, users: [...(lateAdds.users as ObjectId[]), p1._id, (lateAdds.users as ObjectId[])[0]] },
    { ...group(crowd(4), new Date('2020-12-01T10:00:00Z')), assignedAt: null, assignments: undefined },
    { ...group(crowd(3), ago(20)), slug: edge.recentOpenSlug, assignedAt: null, assignments: undefined },
    group(crowd(5), ago(15), { slug: edge.recentDrawnSlug }),
    (() => {
      const [a, b] = crowd(2);
      const ids = [id(a), id(b), gone1.toHexString(), gone2.toHexString()];
      return group([a, b], ago(450), {
        users: [a._id, b._id, gone1, gone2],
        assignments: draw(ids, []),
        exclusions: [{ from: id(a), to: gone1.toHexString() }],
        wishlists: { [gone1.toHexString()]: [{ id: token(21), title: 'Lost wish', description: '' }] },
      });
    })(),
    { ...group(crowd(3), ago(420)), creator: gone2 },
    group(crowd(3), ago(400), { wishlists: { [id(loner)]: [{ id: token(21), title: 'Outside wish', description: '' }] } }),
    group(crowd(3), new Date('2020-11-01T10:00:00Z'), { slug: edge.sharedSlug }),
    group(crowd(3), new Date('2021-11-01T10:00:00Z'), { slug: edge.sharedSlug }),
    group(crowd(3), ago(380), { slug: edge.invalidSlug }),
    group(crowd(3), ago(370), { slug: 'abc' }),
    { ...group(crowd(3), ago(360)), creator: gone1, users: [gone1, gone2, invalid._id] },
    group(crowd(3), ago(350), {
      wishlists: {
        [id(p2)]: [
          { id: token(21), title: '', description: 'Something nice\nsecond line' },
          { id: token(21), title: '   ', description: '' },
          { id: token(21), title: 'x'.repeat(250), description: 'y'.repeat(2500) },
          { id: token(21), title: 'Line\nbreak', description: '' },
          // master never wrote `url`; unvalidated production data might have one.
          { id: token(21), title: 'Kite', description: '', url: 'https://shop.example.com/kite?utm_source=mail&id=3#reviews' },
          { id: token(21), title: 'Not a link', description: '', url: 'javascript:alert(1)' },
          { id: token(21), title: null, description: null },
        ],
      },
    }),
  ];
  const groups = [...regularOdd, ...edgeGroups];

  const unused = user('Una Unused', edge.unusedEmail);
  const all = [...people, dupA, dupB, dupC, exact1, exact2, invalid, loner, ...oddNames, unused];
  const memberships = (u: V1User) => groups.filter((g) => (g.users as ObjectId[]).some((ref) => ref.equals(u._id))).map((g) => g._id);
  const users = all.map((u) => ({ ...u, groups: u === loner ? [groups[0]._id, objectId(ago(10))] : memberships(u) }));
  const tokens = (length: number, hours: number) => all.filter(() => chance(0.3)).map((u) => ({ userId: u._id, exp: now.getTime() + hours * 3600_000, token: token(length) }));
  return {
    users,
    groups,
    loginCodes: tokens(8, 1).map(({ token: code, ...rest }) => ({ ...rest, code, redirectUrl: chance(0.5) ? '/g/abc' : null })),
    refreshTokens: tokens(21, 24 * 60),
  };
};
