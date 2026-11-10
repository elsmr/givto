// New editions any time (77): from drawn, gift day or done; the current one is finished first.
import { todayIn } from '@/lib/local-date';
import { expect, ok, test } from '../fixtures';
import { codeOf, createGroup, editionOf, join, memberIdOf } from './s4-group';

const TZ = 'Europe/Brussels';

test('two editions in the same year: titles, year, finished first, not the same as last time', async ({ signIn, db }) => {
  const [ann, bob, cee] = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const group = ok(await ann.trpc.mutate('group.create', { name: 'Often', organizerName: 'Ann', timeZone: TZ, exchangeMode: 'inPerson' }));
  for (const [person, name] of [[bob, 'Bob'], [cee, 'Cee']] as const) await join(person, group, name);
  const ids = await Promise.all([ann, bob, cee].map((person) => memberIdOf(db, group.slug, person)));
  const year = Number(todayIn(TZ).slice(0, 4));
  const startNext = (title?: string) => ann.trpc.mutate('edition.startNext', { groupSlug: group.slug, ...(title && { title }) });
  const edition = (editionNumber: number) => ({ groupSlug: group.slug, editionNumber });
  /** With three people, avoiding the last draw leaves exactly its reverse. */
  const reversed = (assignments: Record<string, string>) => Object.fromEntries(Object.entries(assignments).map(([santa, giftee]) => [giftee, santa]));

  expect(codeOf(await startNext()), 'open').toBe('EDITION_IN_PROGRESS');
  expect(codeOf(await bob.trpc.mutate('edition.startNext', { groupSlug: group.slug }))).toBe('NOT_ORGANIZER');
  ok(await ann.trpc.mutate('draw.run', edition(1)));

  await test.step('from drawn: the current one is finished, the new one is this year with a numbered title', async () => {
    expect(ok(await startNext())).toEqual({ number: 2 });
    const [first, second] = [await editionOf(db, group.slug, 1), await editionOf(db, group.slug, 2)];
    expect(first.status).toBe('done');
    expect(first.title).toBe(`Secret Santa ${year}`);
    expect(second).toMatchObject({ year, title: `Secret Santa ${year} (2)`, status: 'draft', avoidPreviousGiftees: true, previousEditionId: first._id });
    expect(second.giftDay).toBeUndefined();
    expect(codeOf(await startNext()), 'draft').toBe('EDITION_IN_PROGRESS');
  });

  await test.step('the draw avoids the previous edition of the same year', async () => {
    ok(await ann.trpc.mutate('edition.open', edition(2)));
    ok(await ann.trpc.mutate('draw.run', edition(2)));
    const first = (await editionOf(db, group.slug, 1)).draw!.assignments;
    expect(Object.keys(first).toSorted()).toEqual(ids.toSorted());
    expect((await editionOf(db, group.slug, 2)).draw!.assignments).toEqual(reversed(first));
  });

  await test.step('from gift day, with its own title', async () => {
    ok(await ann.trpc.mutate('manage.startGiftDay', edition(2)));
    expect(ok(await startNext('Summer swap'))).toEqual({ number: 3 });
    expect((await editionOf(db, group.slug, 2)).status).toBe('done');
    expect(await editionOf(db, group.slug, 3)).toMatchObject({ year, title: 'Summer swap', previousEditionId: (await editionOf(db, group.slug, 2))._id });
    ok(await ann.trpc.mutate('edition.open', edition(3)));
    ok(await ann.trpc.mutate('draw.run', edition(3)));
    expect((await editionOf(db, group.slug, 3)).draw!.assignments).toEqual(reversed((await editionOf(db, group.slug, 2)).draw!.assignments));
  });

  await test.step('the next free number, the list by number', async () => {
    ok(await startNext());
    expect((await editionOf(db, group.slug, 4)).title).toBe(`Secret Santa ${year} (3)`);
    const home = ok(await ann.trpc.query('group.get', { groupSlug: group.slug }));
    expect(home.editions.map(({ number, title }) => [number, title])).toEqual([
      [4, `Secret Santa ${year} (3)`],
      [3, 'Summer swap'],
      [2, `Secret Santa ${year} (2)`],
      [1, `Secret Santa ${year}`],
    ]);
    expect(ok(await ann.trpc.query('group.get', edition(2))).edition?.title).toBe(`Secret Santa ${year} (2)`);
  });
});

test('finished early: a gift day still ahead becomes today, so retention follows the real end', async ({ signIn, db }) => {
  const [ann, bob, cee] = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const group = await createGroup(ann, 'Early');
  for (const [person, name] of [[bob, 'Bob'], [cee, 'Cee']] as const) await join(person, group, name);
  ok(await ann.trpc.mutate('draw.run', { groupSlug: group.slug, editionNumber: 1 }));
  await db.editions.updateOne({ _id: (await editionOf(db, group.slug, 1))._id }, { $set: { wishlistBy: '2099-12-01', postBy: '2099-12-20' } });
  ok(await ann.trpc.mutate('edition.startNext', { groupSlug: group.slug }));
  const today = todayIn(TZ);
  expect(await editionOf(db, group.slug, 1)).toMatchObject({
    status: 'done',
    giftDay: { date: today, place: 'Grandma’s' },
    wishlistBy: today,
    postBy: today,
    calendarSequence: 1,
  });
  expect((await editionOf(db, group.slug, 2)).giftDay).toBeUndefined();
});
