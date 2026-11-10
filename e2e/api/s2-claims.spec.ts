// S2 wishlist (was tests/smoke-s2.mjs, second half): per-group views, Dibs! claims and who may
// see them. Groups, editions and draws are seeded in Mongo (seed-groups.ts).
import { expect, ok, test, type TrpcError, type User } from '../fixtures';
import { newId } from '@/lib/server/db';
import { assignments, newMember, seedEdition, seedGroup } from './seed-groups';

const XSS = '<img src=x onerror="document.body.dataset.xss=1">';
const codeOf = (result: { error?: TrpcError }) => result.error?.data.appCode;

test('group views and Dibs!: hidden wishes, claims, who sees what', async ({ signIn, db }) => {
  const [olive, sam, cee, nina, ben] = await Promise.all(['olive', 'sam', 'cee', 'nina', 'ben'].map((name) => signIn(name)));
  // Olive's wishes (tests/smoke-s2.mjs carried these over from its wish CRUD steps).
  const socks = ok(await olive.trpc.mutate('wish.create', { title: 'Wool socks' }));
  const book = ok(await olive.trpc.mutate('wish.create', { title: 'A great novel', url: 'https://shop.test/book' }));
  const scarf = ok(await olive.trpc.mutate('wish.create', { title: 'Surprise me: something cosy', kind: 'surpriseMe' }));
  ok(await olive.trpc.mutate('wish.create', { title: XSS, description: XSS }));

  // Group A: Sam → Olive → Cee → Sam in edition 1; Cee → Olive in edition 2; Nina sits out (not in a draw).
  // Group B: Ben → Olive → Dee (no account) → Ben.
  const aOlive = newMember(olive, 'Olive', { role: 'organizer' });
  const [aSam, aCee, aNina] = [newMember(sam, 'Sam'), newMember(cee, 'Cee'), newMember(nina, 'Nina')];
  const a = await seedGroup(db, 'grpa', olive, [aOlive, aSam, aCee, aNina]);
  const [bBen, bOlive, bDee] = [newMember(ben, 'Ben', { role: 'organizer' }), newMember(olive, 'Olive'), newMember(null, 'Dee')];
  const b = await seedGroup(db, 'grpb', olive, [bBen, bOlive, bDee]);
  const budget = { currency: 'EUR', amount: 2000, maxAmount: 3000 } as const;
  await seedEdition(db, a, 1, 'drawn', { budget, draw: assignments([[aSam, aOlive], [aOlive, aCee], [aCee, aSam]]) });
  await seedEdition(db, a, 2, 'drawn', { budget, draw: assignments([[aCee, aOlive], [aOlive, aSam], [aSam, aCee]]) });
  await seedEdition(db, a, 3, 'open', { budget });
  await seedEdition(db, b, 1, 'giftday', { budget, draw: assignments([[bBen, bOlive], [bOlive, bDee], [bDee, bBen]]) });
  const A1 = { groupSlug: a.slug, editionNumber: 1 };
  const A2 = { groupSlug: a.slug, editionNumber: 2 };
  const B1 = { groupSlug: b.slug, editionNumber: 1 };

  await test.step('group view: hide a wish in group B only', async () => {
    const view = ok(await olive.trpc.query('wish.groupView', { groupSlug: b.slug }));
    expect(view.every((wish) => wish.hidden === false)).toBe(true);
    await olive.trpc.mutate('wish.setHidden', { groupSlug: b.slug, wishId: socks.id, hidden: true });
    const after = ok(await olive.trpc.query('wish.groupView', { groupSlug: b.slug }));
    expect(after.filter((wish) => wish.hidden).map((wish) => wish.id)).toEqual([socks.id]);
    expect(ok(await olive.trpc.query('wish.groupView', { groupSlug: a.slug })).every((wish) => !wish.hidden)).toBe(true);
    expect(codeOf(await olive.trpc.mutate('wish.setHidden', { groupSlug: b.slug, wishId: newId(), hidden: true }))).toBe('NOT_FOUND');
  });

  await test.step('hidden wish never reaches that group’s members; XSS string stays text', async () => {
    const inA = ok(await sam.trpc.query('claim.gifteeWishlist', A1))!;
    expect(inA.giftee.name).toBe('Olive');
    expect(inA.budget).toEqual(budget);
    expect(inA.wishes.some((wish) => wish.id === socks.id)).toBe(true);
    expect(inA.wishes.some((wish) => wish.title === XSS && wish.description === XSS)).toBe(true);
    const inB = await ben.trpc.query('claim.gifteeWishlist', B1);
    expect(inB.data!.wishes.some((wish) => wish.id === socks.id)).toBe(false);
    expect(JSON.stringify(inB), 'hidden wish id not in the response at all').not.toContain(socks.id);
    expect(codeOf(await ben.trpc.mutate('claim.add', { ...B1, wishId: socks.id }))).toBe('NOT_FOUND');
  });

  const stateOf = async (user: User, input: typeof A1, wishId: string) =>
    ok(await user.trpc.query('claim.gifteeWishlist', input))!.wishes.find((wish) => wish.id === wishId)!.claim;

  await test.step('Dibs!: claim, "taken" for other editions and groups, unclaim', async () => {
    const claimed = await sam.trpc.mutate('claim.add', { ...A1, wishId: book.id });
    expect(claimed.data).toEqual({ wishId: book.id, claim: 'mine' });
    expect(await stateOf(sam, A1, book.id)).toBe('mine');
    expect(await stateOf(ben, B1, book.id), 'other group').toBe('taken');
    expect(await stateOf(cee, A2, book.id), 'other edition').toBe('taken');
    expect(codeOf(await ben.trpc.mutate('claim.add', { ...B1, wishId: book.id }))).toBe('WISH_TAKEN');
    expect(codeOf(await ben.trpc.mutate('claim.remove', { ...B1, wishId: book.id }))).toBe('NOT_FOUND');
    await sam.trpc.mutate('claim.remove', { ...A1, wishId: book.id });
    expect(await stateOf(ben, B1, book.id)).toBeNull();
    expect((await ben.trpc.mutate('claim.add', { ...B1, wishId: book.id })).status).toBe(200);
    expect(await stateOf(sam, A1, book.id)).toBe('taken');
  });

  await test.step('non-Santas can’t claim', async () => {
    expect((await nina.trpc.query('claim.gifteeWishlist', A1)).data, 'not in the draw').toBeNull();
    expect(codeOf(await nina.trpc.mutate('claim.add', { ...A1, wishId: scarf.id }))).toBe('NOT_SANTA');
    expect(codeOf(await cee.trpc.mutate('claim.add', { ...A1, wishId: scarf.id })), 'Sam’s Santa, not Olive’s').toBe('NOT_FOUND');
    expect(codeOf(await olive.trpc.mutate('claim.add', { ...A1, wishId: scarf.id })), 'own wish').toBe('NOT_FOUND');
    expect(codeOf(await ben.trpc.query('claim.gifteeWishlist', A1))).toBe('GROUP_NOT_FOUND');
    expect((await sam.trpc.query('claim.gifteeWishlist', { groupSlug: a.slug, editionNumber: 3 })).data, 'no draw yet').toBeNull();
    expect(codeOf(await sam.trpc.mutate('claim.add', { groupSlug: a.slug, editionNumber: 3, wishId: scarf.id }))).toBe('NOT_DRAWN');
  });

  await test.step('owner’s API responses contain no claim data', async () => {
    const responses = [
      await olive.trpc.query('wish.list'),
      await olive.trpc.query('wish.groupView', { groupSlug: a.slug }),
      await olive.trpc.query('wish.groupView', { groupSlug: b.slug }),
      await olive.trpc.mutate('wish.update', { wishId: book.id, title: 'A great novel' }),
    ];
    const claims = await db.claims.find({ wishId: book.id }).toArray();
    expect(claims).toHaveLength(1);
    for (const response of responses) {
      expect(response.status).toBe(200);
      const text = JSON.stringify(response);
      expect(text).not.toMatch(/claim|taken|"mine"/i);
      for (const secret of [claims[0]._id, claims[0].santaMemberId, claims[0].editionId]) expect(text).not.toContain(secret);
    }
    const ownGiftee = await olive.trpc.query('claim.gifteeWishlist', A1);
    expect(ownGiftee.data?.giftee.name, 'Olive’s own giftee, never her own list').toBe('Cee');
    expect(JSON.stringify(ownGiftee)).not.toContain(book.id);
  });

  await test.step('deleting a claimed wish removes its claim', async () => {
    await olive.trpc.mutate('wish.delete', { wishId: book.id });
    expect(await db.claims.countDocuments({ wishId: book.id })).toBe(0);
    expect(await db.groups.countDocuments({ 'members.wishlistView.hiddenWishIds': book.id })).toBe(0);
  });
});
