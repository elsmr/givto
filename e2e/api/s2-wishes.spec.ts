// S2 wishlist (was tests/smoke-s2.mjs, first half): wish CRUD, reorder, ownership, imported
// images and the import guard. Group views and claims: s2-claims.spec.ts.
// (The smoke suite also ran tests/import.check.mjs; that's a unit check in `pnpm test`.)
import { Binary, ObjectId } from 'mongodb';
import { newId } from '@/lib/server/db';
import { BASE_URL } from '../env';
import { expect, ok, readServerLog, test, type TrpcError } from '../fixtures';

const XSS = '<img src=x onerror="document.body.dataset.xss=1">';
const codeOf = (result: { error?: TrpcError }) => result.error?.data.appCode;
const titles = (wishes: { title: string }[]) => wishes.map((wish) => wish.title);

test('wish CRUD, update, reorder; someone else can’t touch your wishes', async ({ signIn, newClient, db }) => {
  const [olive, sam] = await Promise.all([signIn('olive'), signIn('sam')]);
  const { socks, book, scarf } = await test.step('wish CRUD: create with every field, plain-text title, validation', async () => {
    expect((await (await newClient()).trpc.query('wish.list')).status).toBe(401);
    const socks = ok(await olive.trpc.mutate('wish.create', { title: 'Wool socks' }));
    expect([socks.kind, socks.title, socks.reallyWant, socks.description]).toEqual(['wish', 'Wool socks', false, undefined]);
    const book = ok(
      await olive.trpc.mutate('wish.create', {
        title: 'A good novel',
        description: 'Anything by Ursula K. Le Guin.\nPaperback is fine.',
        url: 'https://shop.test/book',
        price: { currency: 'EUR', amount: 1500, maxAmount: 2500 },
        variant: 'Paperback',
        reallyWant: true,
      })
    );
    expect(book.price).toEqual({ currency: 'EUR', amount: 1500, maxAmount: 2500 });
    // The browser sends explicit undefineds (superjson); none may be stored as null.
    const single = ok(await olive.trpc.mutate('wish.create', { title: 'Mug', price: { currency: 'EUR', amount: 900, maxAmount: undefined } }));
    expect(await db.wishes.countDocuments({ _id: single.id, 'price.maxAmount': { $type: 'null' } })).toBe(0);
    ok(await olive.trpc.mutate('wish.delete', { wishId: single.id }));
    const scarf = ok(await olive.trpc.mutate('wish.create', { title: 'Surprise me: something cosy', kind: 'surpriseMe' }));
    const xss = ok(await olive.trpc.mutate('wish.create', { title: XSS, description: XSS }));
    expect(xss.title, 'stored and returned as the same plain string').toBe(XSS);
    for (const bad of [{ title: ' ' }, { title: 'x', url: 'javascript:alert(1)' }, { title: 'x', imageId: newId() }, { title: 'a\nb' }]) {
      expect(codeOf(await olive.trpc.mutate('wish.create', bad)), JSON.stringify(bad)).toBe('INVALID_INPUT');
    }
    expect(titles(ok(await olive.trpc.query('wish.list')))).toEqual(['Wool socks', 'A good novel', 'Surprise me: something cosy', XSS]);
    expect(readServerLog(), 'procedure lines are logged').toMatch(/wish\.create/);
    return { socks, book, scarf };
  });

  await test.step('wish update clears omitted optional fields; delete', async () => {
    const updated = ok(await olive.trpc.mutate('wish.update', { wishId: book.id, title: 'A great novel', url: book.url }));
    expect(updated.title).toBe('A great novel');
    expect(updated.description).toBeUndefined();
    expect(updated.price).toBeUndefined();
    const extra = ok(await olive.trpc.mutate('wish.create', { title: 'Delete me' }));
    expect((await olive.trpc.mutate('wish.delete', { wishId: extra.id })).status).toBe(200);
    expect(ok(await olive.trpc.query('wish.list'))).toHaveLength(4);
  });

  await test.step('reorder (drag and keyboard both use wish.move)', async () => {
    let order = ok(await olive.trpc.mutate('wish.move', { wishId: scarf.id, toIndex: 0 }));
    expect(titles(order)).toEqual(['Surprise me: something cosy', 'Wool socks', 'A great novel', XSS]);
    order = ok(await olive.trpc.mutate('wish.move', { wishId: scarf.id, toIndex: 99 }));
    expect(titles(order)).toEqual(['Wool socks', 'A great novel', XSS, 'Surprise me: something cosy']);
    for (let i = 0; i < 60; i++) await olive.trpc.mutate('wish.move', { wishId: i % 2 ? socks.id : book.id, toIndex: 1 });
    order = ok(await olive.trpc.query('wish.list'));
    expect(titles(order).slice(0, 2), 'positions renumber when gaps shrink').toEqual(['A great novel', 'Wool socks']);
  });

  await test.step('someone else can’t touch your wishes', async () => {
    expect(codeOf(await sam.trpc.mutate('wish.update', { wishId: socks.id, title: 'Mine now' }))).toBe('NOT_FOUND');
    expect(codeOf(await sam.trpc.mutate('wish.delete', { wishId: socks.id }))).toBe('NOT_FOUND');
    expect(codeOf(await sam.trpc.mutate('wish.move', { wishId: socks.id, toIndex: 0 }))).toBe('NOT_FOUND');
  });
});

test('imported image: attach own image only, served by us with safe headers', async ({ signIn, request, db }) => {
  const [olive, sam] = await Promise.all([signIn('olive'), signIn('sam')]);
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const bytes = Buffer.from(png, 'base64');
  const imageId = newId();
  await db.raw.collection('wishImages.files').insertOne({
    _id: new ObjectId(imageId),
    length: bytes.length,
    chunkSize: 261120,
    uploadDate: new Date(),
    filename: 'wish-image',
    metadata: { ownerId: olive.id, contentType: 'image/png' },
  });
  await db.raw.collection('wishImages.chunks').insertOne({ files_id: new ObjectId(imageId), n: 0, data: new Binary(bytes) });
  expect(codeOf(await sam.trpc.mutate('wish.create', { title: 'Stolen image', imageId }))).toBe('INVALID_INPUT');
  const wish = ok(await olive.trpc.mutate('wish.create', { title: 'Lamp', imageId }));
  expect(wish.imageId).toBe(imageId);
  const res = await request.get(`/api/wish-images/${imageId}`);
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toBe('image/png');
  expect(res.headers()['x-content-type-options']).toBe('nosniff');
  expect((await res.body()).toString('base64')).toBe(png);
  expect((await request.get(`/api/wish-images/${newId()}`)).status()).toBe(404);
  expect((await request.get('/api/wish-images/..%2F..%2Fetc')).status()).toBe(404);
  ok(await olive.trpc.mutate('wish.delete', { wishId: wish.id }));
  expect(await db.raw.collection('wishImages.files').countDocuments({ _id: new ObjectId(imageId) })).toBe(0);
});

test('import: signed in only; localhost, 127.0.0.1, [::1], 169.254.169.254 rejected', async ({ signIn, newClient, secrets }) => {
  const olive = await signIn('olive');
  // Import URLs are not logged (checked after the test with the other secrets).
  secrets.push('169.254.169.254');
  expect((await (await newClient()).trpc.mutate('import.fromUrl', { url: 'https://shop.test/' })).status).toBe(401);
  for (const url of [`${BASE_URL}/`, 'http://127.0.0.1/', 'http://[::1]/', 'http://169.254.169.254/latest/meta-data/']) {
    expect(codeOf(await olive.trpc.mutate('import.fromUrl', { url })), url).toBe('IMPORT_BLOCKED');
  }
  expect(codeOf(await olive.trpc.mutate('import.fromUrl', { url: 'javascript:alert(1)' }))).toBe('INVALID_INPUT');
});

test('import: rate limited per person', async ({ signIn }) => {
  const nina = await signIn('nina');
  const codes = [];
  for (let i = 0; i < 21; i++) codes.push(codeOf(await nina.trpc.mutate('import.fromUrl', { url: 'http://127.0.0.1/' })));
  expect(new Set(codes.slice(0, 20))).toEqual(new Set(['IMPORT_BLOCKED']));
  expect(codes[20]).toBe('RATE_LIMITED');
});
