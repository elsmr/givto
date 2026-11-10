// Archived wishes (76): only in the owner's archive, never in a group or a Santa's view, except a
// Santa's own Dibs! ("no longer on the list"); restore; received wishes; delete for good; export.
import { Binary, ObjectId } from 'mongodb';
import { newId } from '@/lib/server/db';
import { expect, ok, test, type TrpcError } from '../fixtures';
import { assignments, newMember, seedEdition, seedGroup } from './seed-groups';

const codeOf = (result: { error?: TrpcError }) => result.error?.data.appCode;
const titles = (wishes: { title: string }[]) => wishes.map((wish) => wish.title);

test('archive, restore, received, delete for good: who sees archived wishes', async ({ signIn, db }) => {
  const [olive, sam, cee, ben] = await Promise.all(['olive', 'sam', 'cee', 'ben'].map((name) => signIn(name)));
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  const imageId = new ObjectId();
  const files = db.raw.collection('wishImages.files');
  await files.insertOne({ _id: imageId, length: png.length, chunkSize: 261120, uploadDate: new Date(), filename: 'wish-image', metadata: { ownerId: olive.id, contentType: 'image/png' } });
  await db.raw.collection('wishImages.chunks').insertOne({ files_id: imageId, n: 0, data: new Binary(png) });

  const socks = ok(await olive.trpc.mutate('wish.create', { title: 'Wool socks' }));
  const book = ok(await olive.trpc.mutate('wish.create', { title: 'A good novel', links: [{ url: 'https://shop.test/book', imageId: imageId.toHexString() }] }));
  const mug = ok(await olive.trpc.mutate('wish.create', { title: 'Moomin mug' }));

  // Group A: Sam → Olive → Cee → Sam. Group B: Ben → Olive → Ben.
  const [aOlive, aSam, aCee] = [newMember(olive, 'Olive', { role: 'organizer' }), newMember(sam, 'Sam'), newMember(cee, 'Cee')];
  const a = await seedGroup(db, 'arca', olive, [aOlive, aSam, aCee]);
  const [bBen, bOlive] = [newMember(ben, 'Ben', { role: 'organizer' }), newMember(olive, 'Olive')];
  const b = await seedGroup(db, 'arcb', olive, [bBen, bOlive]);
  await seedEdition(db, a, 1, 'drawn', { draw: assignments([[aSam, aOlive], [aOlive, aCee], [aCee, aSam]]) });
  await seedEdition(db, b, 1, 'drawn', { draw: assignments([[bBen, bOlive], [bOlive, bBen]]) });
  const A1 = { groupSlug: a.slug, editionNumber: 1 };
  const B1 = { groupSlug: b.slug, editionNumber: 1 };
  const samSees = async () => ok(await sam.trpc.query('claim.gifteeWishlist', A1))!.wishes;

  await test.step('archived wishes leave every list and every Santa, except their own Dibs!', async () => {
    ok(await olive.trpc.mutate('wish.setHidden', { groupSlug: b.slug, wishId: socks.id, hidden: true }));
    ok(await sam.trpc.mutate('gift.set', { ...A1, wishIds: [book.id], lines: [] }));
    ok(await olive.trpc.mutate('wish.archive', { wishId: book.id }));
    ok(await olive.trpc.mutate('wish.archive', { wishId: socks.id }));

    expect(titles(ok(await olive.trpc.query('wish.list')))).toEqual(['Moomin mug']);
    expect(titles(ok(await olive.trpc.query('wish.groupView', { groupSlug: a.slug })))).toEqual(['Moomin mug']);
    expect(titles(ok(await olive.trpc.query('wish.archived'))), 'last archived first').toEqual(['Wool socks', 'A good novel']);

    const inB = await ben.trpc.query('claim.gifteeWishlist', B1);
    expect(titles(inB.data!.wishes)).toEqual(['Moomin mug']);
    for (const id of [socks.id, book.id]) expect(JSON.stringify(inB)).not.toContain(id);
    expect(codeOf(await ben.trpc.mutate('claim.add', { ...B1, wishId: socks.id }))).toBe('NOT_FOUND');
    expect(codeOf(await ben.trpc.mutate('gift.set', { ...B1, wishIds: [socks.id], lines: [] }))).toBe('NOT_FOUND');

    expect((await samSees()).map(({ title, archived, claim }) => ({ title, archived, claim }))).toEqual([
      { title: 'Moomin mug', archived: false, claim: null },
      { title: 'A good novel', archived: true, claim: 'mine' },
    ]);
    expect(codeOf(await sam.trpc.mutate('claim.add', { ...A1, wishId: socks.id })), 'no new Dibs! on archived wishes').toBe('NOT_FOUND');
    expect(ok(await sam.trpc.query('gift.mine', A1)).wishIds, 'the gift mark stays').toEqual([book.id]);
    ok(await sam.trpc.mutate('gift.set', { ...A1, wishIds: [book.id], lines: ['A scarf'] }));
    expect(await db.claims.countDocuments({ wishId: book.id })).toBe(1);
    expect(codeOf(await sam.trpc.mutate('wish.archive', { wishId: mug.id }))).toBe('NOT_FOUND');
    expect(codeOf(await sam.trpc.mutate('wish.restore', { wishId: book.id }))).toBe('NOT_FOUND');
  });

  await test.step('restore: back at the end, hidden where it was hidden, Dibs! kept', async () => {
    expect(ok(await olive.trpc.mutate('wish.restore', { wishId: socks.id })).title).toBe('Wool socks');
    expect(codeOf(await olive.trpc.mutate('wish.restore', { wishId: socks.id })), 'not archived').toBe('NOT_FOUND');
    expect(titles(ok(await olive.trpc.query('wish.list')))).toEqual(['Moomin mug', 'Wool socks']);
    const inB = ok(await olive.trpc.query('wish.groupView', { groupSlug: b.slug }));
    expect(inB.find((wish) => wish.id === socks.id)?.hidden).toBe(true);
    ok(await olive.trpc.mutate('wish.restore', { wishId: book.id }));
    expect((await samSees()).find((wish) => wish.id === book.id)).toMatchObject({ archived: false, claim: 'mine' });
  });

  await test.step('received wishes are in the archive; restore brings them back', async () => {
    ok(await olive.trpc.mutate('giftday.markReceived', { wishId: mug.id, received: true }));
    expect(titles(ok(await olive.trpc.query('wish.archived')))).toEqual(['Moomin mug']);
    ok(await olive.trpc.mutate('wish.restore', { wishId: mug.id }));
    expect((await db.wishes.findOne({ _id: mug.id }))!.receivedAt).toBeUndefined();
    expect(ok(await olive.trpc.query('wish.archived'))).toEqual([]);
  });

  await test.step('export marks archived wishes', async () => {
    ok(await olive.trpc.mutate('wish.archive', { wishId: socks.id }));
    const wishes = ok(await olive.trpc.query('account.export')).wishes;
    expect(wishes.find((wish) => wish._id === socks.id)?.archivedAt).toBeTruthy();
    expect(wishes.find((wish) => wish._id === mug.id)?.archivedAt).toBeUndefined();
  });

  await test.step('delete for good removes images and Dibs!; the Santa keeps the gift mark', async () => {
    ok(await olive.trpc.mutate('wish.archive', { wishId: book.id }));
    ok(await olive.trpc.mutate('wish.delete', { wishId: book.id }));
    expect(await files.countDocuments({ _id: imageId })).toBe(0);
    expect(await db.claims.countDocuments({ wishId: book.id })).toBe(0);
    expect(titles(ok(await olive.trpc.query('wish.archived')))).toEqual(['Wool socks']);
    expect(ok(await sam.trpc.query('gift.mine', A1)).wishIds).toEqual([book.id]);
    ok(await sam.trpc.mutate('gift.set', { ...A1, wishIds: [book.id], lines: ['A scarf'] }));
  });
});

test('the archive holds at most 200 wishes', async ({ signIn, db }) => {
  const nina = await signIn('nina');
  const now = new Date();
  await db.wishes.insertMany(
    Array.from({ length: 200 }, (_, position) => ({
      _id: newId(), ownerId: nina.id, kind: 'wish' as const, title: `Old ${position}`, links: [], reallyWant: false,
      position, archivedAt: now, createdAt: now, updatedAt: now,
    }))
  );
  const wish = ok(await nina.trpc.mutate('wish.create', { title: 'One more' }));
  expect(codeOf(await nina.trpc.mutate('wish.archive', { wishId: wish.id }))).toBe('ARCHIVE_FULL');
  ok(await nina.trpc.mutate('wish.delete', { wishId: (await db.wishes.findOne({ ownerId: nina.id, title: 'Old 0' }))!._id }));
  ok(await nina.trpc.mutate('wish.archive', { wishId: wish.id }));
});
