// Gift day (part 1; 31, 32, 38): unwrap order, presenter view, the big
// reveal, received wishes. Part 2 (turns, status by local date): s6-giftday-turns.spec.ts.
import { expect, ok, test } from '../fixtures';
import { code, drawnGroup, editionOf, memberIdOf } from './s6-helpers';

test('gift day: unwrap order, late joiners, presenter, reveal, received wishes, done', async ({ signIn, db }) => {
  const [ann, bob, cee, dan, eve, zed] = await Promise.all(['ann', 'bob', 'cee', 'dan', 'eve', 'zed'].map((name) => signIn(name)));
  const family = await drawnGroup([ann, bob, cee, dan], 'Family');
  const slug = family.slug;
  const edition = { groupSlug: slug, editionNumber: 1 };
  const setStatus = async (status: 'giftday' | 'done') => {
    const { _id } = await editionOf(db, slug);
    await db.editions.updateOne({ _id }, { $set: { status } });
  };

  await test.step('unwrap order: organizer-only shuffle, the same for every member, reshuffle changes it', async () => {
    const open = ok(
      await ann.trpc.mutate('group.create', { name: 'Open', organizerName: 'Ann', timeZone: 'Europe/Brussels', exchangeMode: 'inPerson' })
    );
    expect(code(await ann.trpc.mutate('giftday.shuffle', { groupSlug: open.slug, editionNumber: 1 }))).toBe('NOT_DRAWN');
    expect(code(await bob.trpc.mutate('giftday.shuffle', edition))).toBe('NOT_ORGANIZER');
    expect(code(await zed.trpc.mutate('giftday.shuffle', edition))).toBe('GROUP_NOT_FOUND');
    expect(code(await zed.trpc.query('giftday.get', edition))).toBe('GROUP_NOT_FOUND');
    expect(ok(await bob.trpc.query('giftday.get', edition)).unwrapOrder).toBeNull();

    ok(await ann.trpc.mutate('giftday.shuffle', edition));
    // Members see the same view, without the order itself (a surprise, see z2); the presenter has it.
    const orders = await Promise.all([ann, bob, cee, dan].map(async (p) => ok(await p.trpc.query('giftday.get', edition)).unwrapOrder));
    for (const order of orders) expect(order).toEqual(orders[0]);
    const presented = ok(await ann.trpc.query('giftday.presenter', edition)).unwrapOrder!;
    const stored = await editionOf(db, slug);
    expect(presented.people.map((p) => p.memberId).toSorted()).toEqual(Object.keys(stored.draw!.assignments).toSorted());
    expect(presented.people.map((p) => p.memberId)).toEqual(stored.unwrapOrder!.memberIds);

    const first = presented.people.map((p) => p.memberId).join();
    let changed = false;
    for (let i = 0; i < 10 && !changed; i++) {
      ok(await ann.trpc.mutate('giftday.shuffle', edition));
      changed = (await editionOf(db, slug)).unwrapOrder!.memberIds.join() !== first;
    }
    expect(changed, 'ten reshuffles never changed the order').toBe(true);
    const after = ok(await ann.trpc.query('giftday.presenter', edition)).unwrapOrder!;
    expect(after.people.map((p) => p.memberId)).toEqual((await editionOf(db, slug)).unwrapOrder!.memberIds);
  });

  await test.step('late joiners unwrap last', async () => {
    ok(await eve.trpc.mutate('join.accept', { groupSlug: slug, token: family.joinToken, name: 'Eve' }));
    const eveId = await memberIdOf(db, slug, eve);
    expect(Object.keys((await editionOf(db, slug)).draw!.assignments), 'Eve was slotted in').toContain(eveId);
    expect(ok(await ann.trpc.query('giftday.presenter', edition)).unwrapOrder!.people.at(-1)!.memberId).toBe(eveId);
  });

  await test.step('presenter view is organizer-only', async () => {
    expect(code(await bob.trpc.query('giftday.presenter', edition))).toBe('NOT_ORGANIZER');
    expect(code(await zed.trpc.query('giftday.presenter', edition))).toBe('GROUP_NOT_FOUND');
    const view = ok(await ann.trpc.query('giftday.presenter', edition));
    expect(view.groupName).toBe('Family');
    expect(view.status).toBe('drawn');
    expect(view.unwrapOrder!.people).toHaveLength(5);
    expect(view.reveal.pairs).toBeNull();
  });

  await test.step('the big reveal: off by default, can be on before the draw; pairs never in the API before it is on and gift day', async () => {
    expect((await editionOf(db, slug)).reveal).toEqual({ enabled: false });
    const open = ok(
      await ann.trpc.mutate('group.create', { name: 'Undrawn', organizerName: 'Ann', timeZone: 'Europe/Brussels', exchangeMode: 'inPerson' })
    );
    ok(await ann.trpc.mutate('giftday.setReveal', { groupSlug: open.slug, editionNumber: 1, enabled: true }));
    expect(ok(await ann.trpc.query('group.get', { groupSlug: open.slug })).edition!.reveal).toBe(true);
    const expectSantaFree = async () => {
      for (const person of [ann, bob]) {
        for (const text of [
          JSON.stringify(ok(await person.trpc.query('giftday.get', edition))),
          JSON.stringify(ok(await person.trpc.query('group.get', { groupSlug: slug }))),
        ]) {
          expect(text, 'leaks the draw').not.toContain('santa');
          expect(text, 'leaks the draw').not.toContain('assignments');
        }
      }
    };
    await expectSantaFree();
    expect(code(await bob.trpc.mutate('giftday.setReveal', { ...edition, enabled: true }))).toBe('NOT_ORGANIZER');
    expect(code(await ann.trpc.mutate('giftday.reveal', edition))).toBe('NOT_GIFT_DAY');
    ok(await ann.trpc.mutate('giftday.setReveal', { ...edition, enabled: true }));
    expect(code(await ann.trpc.mutate('giftday.reveal', edition))).toBe('NOT_GIFT_DAY');
    expect(ok(await bob.trpc.query('giftday.get', edition)).reveal).toEqual({ enabled: true, revealed: false, pairs: null });
    await expectSantaFree();

    await setStatus('giftday');
    await expectSantaFree();
    ok(await ann.trpc.mutate('giftday.setReveal', { ...edition, enabled: false }));
    expect(code(await ann.trpc.mutate('giftday.reveal', edition))).toBe('REVEAL_OFF');
    ok(await ann.trpc.mutate('giftday.setReveal', { ...edition, enabled: true }));
    expect(code(await bob.trpc.mutate('giftday.reveal', edition))).toBe('NOT_ORGANIZER');
    ok(await ann.trpc.mutate('giftday.reveal', edition));

    const names = Object.fromEntries((await db.groups.findOne({ slug }))!.members.map((m) => [m.id, m.name]));
    const byGiftee = (a: { giftee: string }, b: { giftee: string }) => a.giftee.localeCompare(b.giftee);
    const expected = Object.entries((await editionOf(db, slug)).draw!.assignments)
      .map(([santa, giftee]) => ({ giftee: names[giftee], santa: names[santa] }))
      .toSorted(byGiftee);
    for (const person of [bob, cee, eve]) {
      const { reveal } = ok(await person.trpc.query('giftday.get', edition));
      expect(reveal.revealed).toBe(true);
      expect(reveal.pairs!.toSorted(byGiftee)).toEqual(expected);
    }
    expect(code(await zed.trpc.query('giftday.get', edition))).toBe('GROUP_NOT_FOUND');

    ok(await ann.trpc.mutate('giftday.setReveal', { ...edition, enabled: false }));
    expect(ok(await bob.trpc.query('giftday.get', edition)).reveal.pairs).toBeNull();
    expect((await editionOf(db, slug)).reveal.revealedAt).toBeUndefined();
  });

  await test.step('received wishes: owner only, hidden from Santas and lists', async () => {
    const wish = ok(await bob.trpc.mutate('wish.create', { title: 'Board game', groupSlugs: [slug] }));
    const bobId = await memberIdOf(db, slug, bob);
    const santaId = Object.entries((await editionOf(db, slug)).draw!.assignments).find(([, giftee]) => giftee === bobId)![0];
    const santaIds = await Promise.all([ann, cee, dan, eve].map((person) => memberIdOf(db, slug, person)));
    const santa = [ann, cee, dan, eve][santaIds.indexOf(santaId)];
    const santaSees = async () => ok(await santa.trpc.query('claim.gifteeWishlist', edition))!.wishes.some((w) => w.id === wish.id);
    expect(await santaSees()).toBe(true);
    expect(code(await santa.trpc.mutate('giftday.markReceived', { wishId: wish.id, received: true }))).toBe('NOT_FOUND');
    expect(code(await zed.trpc.mutate('giftday.markReceived', { wishId: wish.id, received: true }))).toBe('NOT_FOUND');
    expect(await santaSees()).toBe(true);

    ok(await bob.trpc.mutate('giftday.markReceived', { wishId: wish.id, received: true }));
    expect((await db.wishes.findOne({ _id: wish.id }))!.receivedAt).toBeTruthy();
    expect(await santaSees()).toBe(false);
    expect(ok(await bob.trpc.query('wish.list')).some((w) => w.id === wish.id)).toBe(false);
    expect(ok(await bob.trpc.query('wish.groupView', { groupSlug: slug })).some((w) => w.id === wish.id)).toBe(false);

    ok(await bob.trpc.mutate('giftday.markReceived', { wishId: wish.id, received: false }));
    expect(await santaSees()).toBe(true);
    ok(await bob.trpc.mutate('giftday.markReceived', { wishId: wish.id, received: true }));
  });

  await test.step('once the edition is done: no shuffling, and the reveal is out without the presenter', async () => {
    await setStatus('done');
    expect(code(await ann.trpc.mutate('giftday.shuffle', edition))).toBe('EDITION_CLOSED');
    const closed = ok(await dan.trpc.query('giftday.get', edition)).reveal;
    expect(closed.revealed, 'no big reveal').toBe(false);
    expect(closed.pairs, 'but a done edition shows who gave to whom (100)').toHaveLength(5);
    ok(await ann.trpc.mutate('giftday.setReveal', { ...edition, enabled: true }));
    expect(ok(await dan.trpc.query('giftday.get', edition)).reveal.revealed).toBe(true);
    expect((await editionOf(db, slug)).reveal.revealedAt).toBeUndefined();
  });
});
