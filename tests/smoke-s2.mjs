// Wishlist slice smoke (38, 39, 46): wishes, group views, claims and import, against a running
// app (tests/env.sh s2 4001 27052 4091). Groups, editions and draws are seeded in Mongo.
// Run: BASE_URL=… MAIL_URL=… MONGO_CONTAINER=… [SERVER_LOG=…] pnpm test:smoke:s2
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { as, emailsSeen, mongo, signIn, step, trpc } from './smoke-s2-client.mjs';

await import('./import.check.mjs');

const BASE = process.env.BASE_URL ?? 'http://localhost:4001';
const id = () => randomBytes(12).toString('hex');
const XSS = '<img src=x onerror="document.body.dataset.xss=1">';

const [olive, sam, cee, nina, ben] = await Promise.all(['olive', 'sam', 'cee', 'nina', 'ben'].map(signIn));

const codeOf = (result) => result.error?.data?.appCode;
const titles = (wishes) => wishes.map((wish) => wish.title);

let socks, book, scarf, xss;
await step('wish CRUD: create with every field, plain-text title, validation', async () => {
  assert.equal((await trpc('wish.list')).status, 401);
  socks = (await as(olive).mutate('wish.create', { title: 'Wool socks' })).data;
  assert.deepEqual([socks.kind, socks.title, socks.reallyWant, socks.description], ['wish', 'Wool socks', false, undefined]);
  book = (
    await as(olive).mutate('wish.create', {
      title: 'A good novel',
      description: 'Anything by Ursula K. Le Guin.\nPaperback is fine.',
      url: 'https://shop.test/book',
      price: { currency: 'EUR', amount: 1500, maxAmount: 2500 },
      variant: 'Paperback',
      reallyWant: true,
    })
  ).data;
  assert.deepEqual(book.price, { currency: 'EUR', amount: 1500, maxAmount: 2500 });
  // The browser sends explicit undefineds (superjson); none may be stored as null.
  const single = (await as(olive).mutate('wish.create', { title: 'Mug', price: { currency: 'EUR', amount: 900, maxAmount: undefined } })).data;
  assert.equal(mongo(`db.wishes.countDocuments({ _id: '${single.id}', 'price.maxAmount': { $type: 'null' } })`), '0');
  await as(olive).mutate('wish.delete', { wishId: single.id });
  scarf = (await as(olive).mutate('wish.create', { title: 'Surprise me: something cosy', kind: 'surpriseMe' })).data;
  xss = (await as(olive).mutate('wish.create', { title: XSS, description: XSS })).data;
  assert.equal(xss.title, XSS, 'stored and returned as the same plain string');
  for (const bad of [{ title: ' ' }, { title: 'x', url: 'javascript:alert(1)' }, { title: 'x', imageId: id() }, { title: 'a\nb' }]) {
    assert.equal(codeOf(await as(olive).mutate('wish.create', bad)), 'INVALID_INPUT', JSON.stringify(bad));
  }
  assert.deepEqual(titles((await as(olive).query('wish.list')).data), ['Wool socks', 'A good novel', 'Surprise me: something cosy', XSS]);
});

await step('wish update clears omitted optional fields; delete', async () => {
  const updated = (await as(olive).mutate('wish.update', { wishId: book.id, title: 'A great novel', url: book.url })).data;
  assert.equal(updated.title, 'A great novel');
  assert.equal(updated.description, undefined);
  assert.equal(updated.price, undefined);
  const extra = (await as(olive).mutate('wish.create', { title: 'Delete me' })).data;
  assert.equal((await as(olive).mutate('wish.delete', { wishId: extra.id })).status, 200);
  assert.equal((await as(olive).query('wish.list')).data.length, 4);
});

await step('reorder (drag and keyboard both use wish.move)', async () => {
  let order = (await as(olive).mutate('wish.move', { wishId: scarf.id, toIndex: 0 })).data;
  assert.deepEqual(titles(order), ['Surprise me: something cosy', 'Wool socks', 'A great novel', XSS]);
  order = (await as(olive).mutate('wish.move', { wishId: scarf.id, toIndex: 99 })).data;
  assert.deepEqual(titles(order), ['Wool socks', 'A great novel', XSS, 'Surprise me: something cosy']);
  for (let i = 0; i < 60; i++) await as(olive).mutate('wish.move', { wishId: i % 2 ? socks.id : book.id, toIndex: 1 });
  order = (await as(olive).query('wish.list')).data;
  assert.deepEqual(titles(order).slice(0, 2), ['A great novel', 'Wool socks'], 'positions renumber when gaps shrink');
});

await step("someone else can't touch your wishes", async () => {
  assert.equal(codeOf(await as(sam).mutate('wish.update', { wishId: socks.id, title: 'Mine now' })), 'NOT_FOUND');
  assert.equal(codeOf(await as(sam).mutate('wish.delete', { wishId: socks.id })), 'NOT_FOUND');
  assert.equal(codeOf(await as(sam).mutate('wish.move', { wishId: socks.id, toIndex: 0 })), 'NOT_FOUND');
});

// Group A: Sam → Olive → Cee → Sam in edition 1; Cee → Olive in edition 2; Nina sits out.
// Group B: Ben → Olive → Dee (no account) → Ben.
const member = (user, name, role = 'member') => ({
  id: id(),
  ...(user && { userId: user.id }),
  name,
  role,
  status: 'joined',
  wishlistView: { includeNewWishes: true, hiddenWishIds: [] },
});
const a = { _id: id(), slug: `grpa${id().slice(0, 8)}`, m: {} };
const b = { _id: id(), slug: `grpb${id().slice(0, 8)}`, m: {} };
Object.assign(a.m, { olive: member(olive, 'Olive', 'organizer'), sam: member(sam, 'Sam'), cee: member(cee, 'Cee'), nina: member(nina, 'Nina') });
Object.assign(b.m, { ben: member(ben, 'Ben', 'organizer'), olive: member(olive, 'Olive'), dee: member(null, 'Dee') });
const draw = (pairs) => ({ assignments: Object.fromEntries(pairs.map(([s, g]) => [s.id, g.id])), history: [] });
const edition = (group, number, status, assignments) => ({
  _id: id(),
  groupId: group._id,
  number,
  year: 2025 + number,
  title: `Secret Santa ${2025 + number}`,
  timeZone: 'Europe/Brussels',
  exchangeMode: 'inPerson',
  budget: { currency: 'EUR', amount: 2000, maxAmount: 3000 },
  avoidPreviousGiftees: false,
  status,
  statusChangedAt: {},
  participants: Object.values(group.m).map((m) => ({ memberId: m.id, participates: true, status: 'joined' })),
  ...(assignments && { draw: assignments }),
  reveal: { enabled: false },
});
const { olive: aOlive, sam: aSam, cee: aCee } = a.m;
const editions = [
  edition(a, 1, 'drawn', draw([[aSam, aOlive], [aOlive, aCee], [aCee, aSam]])),
  edition(a, 2, 'drawn', draw([[aCee, aOlive], [aOlive, aSam], [aSam, aCee]])),
  edition(a, 3, 'open'),
  edition(b, 1, 'giftday', draw([[b.m.ben, b.m.olive], [b.m.olive, b.m.dee], [b.m.dee, b.m.ben]])),
];
mongo(`
  const now = new Date();
  const withDates = (doc) => ({ ...doc, createdAt: now, updatedAt: now });
  const groups = ${JSON.stringify([a, b].map(({ m, ...g }) => ({ ...g, name: 'Family', locale: 'en', defaults: { timeZone: 'Europe/Brussels', exchangeMode: 'inPerson' }, createdBy: olive.id, members: Object.values(m), exclusions: [], households: [] })))};
  db.groups.insertMany(groups.map(withDates));
  const editions = ${JSON.stringify(editions)};
  db.editions.insertMany(editions.map((e) => withDates({ ...e, participants: e.participants.map((p) => ({ ...p, addedAt: now })), ...(e.draw && { draw: { ...e.draw, drawnAt: now } }) })));
`);
const A1 = { groupSlug: a.slug, editionNumber: 1 };
const A2 = { groupSlug: a.slug, editionNumber: 2 };
const B1 = { groupSlug: b.slug, editionNumber: 1 };

await step('group view: hide a wish in group B only', async () => {
  const view = (await as(olive).query('wish.groupView', { groupSlug: b.slug })).data;
  assert.ok(view.every((wish) => wish.hidden === false));
  await as(olive).mutate('wish.setHidden', { groupSlug: b.slug, wishId: socks.id, hidden: true });
  const after = (await as(olive).query('wish.groupView', { groupSlug: b.slug })).data;
  assert.deepEqual(after.filter((wish) => wish.hidden).map((wish) => wish.id), [socks.id]);
  assert.ok((await as(olive).query('wish.groupView', { groupSlug: a.slug })).data.every((wish) => !wish.hidden));
  assert.equal(codeOf(await as(olive).mutate('wish.setHidden', { groupSlug: b.slug, wishId: id(), hidden: true })), 'NOT_FOUND');
});

await step("hidden wish never reaches that group's members; XSS string stays text", async () => {
  const inA = (await as(sam).query('claim.gifteeWishlist', A1)).data;
  assert.equal(inA.giftee.name, 'Olive');
  assert.deepEqual(inA.budget, { currency: 'EUR', amount: 2000, maxAmount: 3000 });
  assert.ok(inA.wishes.some((wish) => wish.id === socks.id));
  assert.ok(inA.wishes.some((wish) => wish.title === XSS && wish.description === XSS));
  const inB = await as(ben).query('claim.gifteeWishlist', B1);
  assert.ok(!inB.data.wishes.some((wish) => wish.id === socks.id));
  assert.ok(!JSON.stringify(inB).includes(socks.id), 'hidden wish id not in the response at all');
  assert.equal(codeOf(await as(ben).mutate('claim.add', { ...B1, wishId: socks.id })), 'NOT_FOUND');
});

const stateOf = async (user, input, wishId) =>
  (await as(user).query('claim.gifteeWishlist', input)).data.wishes.find((wish) => wish.id === wishId).claim;

await step('Dibs!: claim, "taken" for other editions and groups, unclaim', async () => {
  const claimed = await as(sam).mutate('claim.add', { ...A1, wishId: book.id });
  assert.deepEqual(claimed.data, { wishId: book.id, claim: 'mine' });
  assert.equal(await stateOf(sam, A1, book.id), 'mine');
  assert.equal(await stateOf(ben, B1, book.id), 'taken', 'other group');
  assert.equal(await stateOf(cee, A2, book.id), 'taken', 'other edition');
  assert.equal(codeOf(await as(ben).mutate('claim.add', { ...B1, wishId: book.id })), 'WISH_TAKEN');
  assert.equal(codeOf(await as(ben).mutate('claim.remove', { ...B1, wishId: book.id })), 'NOT_FOUND');
  await as(sam).mutate('claim.remove', { ...A1, wishId: book.id });
  assert.equal(await stateOf(ben, B1, book.id), null);
  assert.equal((await as(ben).mutate('claim.add', { ...B1, wishId: book.id })).status, 200);
  assert.equal(await stateOf(sam, A1, book.id), 'taken');
});

await step("non-Santas can't claim", async () => {
  assert.equal((await as(nina).query('claim.gifteeWishlist', A1)).data, null, 'not in the draw');
  assert.equal(codeOf(await as(nina).mutate('claim.add', { ...A1, wishId: scarf.id })), 'NOT_SANTA');
  assert.equal(codeOf(await as(cee).mutate('claim.add', { ...A1, wishId: scarf.id })), 'NOT_FOUND', "Sam's Santa, not Olive's");
  assert.equal(codeOf(await as(olive).mutate('claim.add', { ...A1, wishId: scarf.id })), 'NOT_FOUND', 'own wish');
  assert.equal(codeOf(await as(ben).query('claim.gifteeWishlist', A1)), 'GROUP_NOT_FOUND');
  assert.equal((await as(sam).query('claim.gifteeWishlist', { groupSlug: a.slug, editionNumber: 3 })).data, null, 'no draw yet');
  assert.equal(codeOf(await as(sam).mutate('claim.add', { groupSlug: a.slug, editionNumber: 3, wishId: scarf.id })), 'NOT_DRAWN');
});

await step("owner's API responses contain no claim data", async () => {
  const responses = [
    await as(olive).query('wish.list'),
    await as(olive).query('wish.groupView', { groupSlug: a.slug }),
    await as(olive).query('wish.groupView', { groupSlug: b.slug }),
    await as(olive).mutate('wish.update', { wishId: book.id, title: 'A great novel' }),
  ];
  const claims = JSON.parse(mongo(`JSON.stringify(db.claims.find({ wishId: '${book.id}' }).toArray())`));
  assert.equal(claims.length, 1);
  for (const response of responses) {
    assert.equal(response.status, 200);
    const text = JSON.stringify(response);
    assert.doesNotMatch(text, /claim|taken|"mine"/i);
    for (const secret of [claims[0]._id, claims[0].santaMemberId, claims[0].editionId]) assert.ok(!text.includes(secret));
  }
  const ownGiftee = await as(olive).query('claim.gifteeWishlist', A1);
  assert.equal(ownGiftee.data.giftee.name, 'Cee', "Olive's own giftee, never her own list");
  assert.ok(!JSON.stringify(ownGiftee).includes(book.id));
});

await step('deleting a claimed wish removes its claim', async () => {
  await as(olive).mutate('wish.delete', { wishId: book.id });
  assert.equal(mongo(`db.claims.countDocuments({ wishId: '${book.id}' })`), '0');
  assert.equal(mongo(`db.groups.countDocuments({ 'members.wishlistView.hiddenWishIds': '${book.id}' })`), '0');
});

await step('imported image: attach own image only, served by us with safe headers', async () => {
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const imageId = id();
  mongo(`
    db.wishImages.files.insertOne({ _id: ObjectId('${imageId}'), length: ${Buffer.from(png, 'base64').length}, chunkSize: 261120, uploadDate: new Date(), filename: 'wish-image', metadata: { ownerId: '${olive.id}', contentType: 'image/png' } });
    db.wishImages.chunks.insertOne({ files_id: ObjectId('${imageId}'), n: 0, data: BinData(0, '${png}') });
  `);
  assert.equal(codeOf(await as(sam).mutate('wish.create', { title: 'Stolen image', imageId })), 'INVALID_INPUT');
  const wish = (await as(olive).mutate('wish.create', { title: 'Lamp', imageId })).data;
  assert.equal(wish.imageId, imageId);
  const res = await fetch(`${BASE}/api/wish-images/${imageId}`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'image/png');
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(Buffer.from(await res.arrayBuffer()).toString('base64'), png);
  assert.equal((await fetch(`${BASE}/api/wish-images/${id()}`)).status, 404);
  assert.equal((await fetch(`${BASE}/api/wish-images/..%2F..%2Fetc`)).status, 404);
  await as(olive).mutate('wish.delete', { wishId: wish.id });
  assert.equal(mongo(`db.wishImages.files.countDocuments({ _id: ObjectId('${imageId}') })`), '0');
});

await step('import: signed in only; localhost, 127.0.0.1, [::1], 169.254.169.254 rejected', async () => {
  assert.equal((await trpc('import.fromUrl', { url: 'https://shop.test/' }, { mutation: true })).status, 401);
  for (const url of ['http://localhost:4001/', 'http://127.0.0.1/', 'http://[::1]/', 'http://169.254.169.254/latest/meta-data/']) {
    assert.equal(codeOf(await as(olive).mutate('import.fromUrl', { url })), 'IMPORT_BLOCKED', url);
  }
  assert.equal(codeOf(await as(olive).mutate('import.fromUrl', { url: 'javascript:alert(1)' })), 'INVALID_INPUT');
});

await step('import: rate limited per person', async () => {
  const codes = [];
  for (let i = 0; i < 21; i++) codes.push(codeOf(await as(nina).mutate('import.fromUrl', { url: 'http://127.0.0.1/' })));
  assert.deepEqual(new Set(codes.slice(0, 20)), new Set(['IMPORT_BLOCKED']));
  assert.equal(codes[20], 'RATE_LIMITED');
});

if (process.env.SERVER_LOG) {
  await step('server log has no emails or imported URLs', async () => {
    const log = readFileSync(process.env.SERVER_LOG, 'utf8');
    assert.match(log, /wish\.create/);
    for (const email of emailsSeen) assert.ok(!log.includes(email), `leaked: ${email}`);
    assert.ok(!log.includes('169.254.169.254'), 'import URLs are not logged');
  });
}
