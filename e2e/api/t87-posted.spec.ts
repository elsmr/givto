// Posted Secret Santa (87): the Santa marks a marked gift posted, the giftee says it arrived, the Santa sees that and
// nothing more; the giftee never learns who; the organizer sees who hasn't posted, names only. A video-call link on
// gift day. Only when gifts go by post.
import { expect, ok, test, type TestDb, type User } from '../fixtures';
import { code, editionOf, memberIdOf } from './s6-helpers';

const CALL = 'https://meet.example.com/abc-defg-hij';

const groupOf = async ([ann, ...others]: User[], name: string, exchangeMode: 'byPost' | 'both' | 'inPerson' = 'byPost') => {
  const group = ok(await ann.trpc.mutate('group.create', { name, organizerName: 'Ann', timeZone: 'Europe/Brussels', giftDay: { date: '2099-12-24' }, exchangeMode }));
  for (const [i, person] of others.entries()) {
    ok(await person.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name: ['Bob', 'Cee', 'Dan'][i] }));
  }
  return group;
};

/** A Santa and their giftee, neither of them the organizer. */
const pairOf = async (db: TestDb, slug: string, [ann, ...others]: User[]) => {
  const { draw } = await editionOf(db, slug);
  const ids = new Map(await Promise.all(others.map(async (person) => [await memberIdOf(db, slug, person), person] as const)));
  const [santaId, gifteeId] = Object.entries(draw!.assignments).find(([santa, giftee]) => ids.has(santa) && ids.has(giftee))!;
  const santaName = (await db.groups.findOne({ slug }))!.members.find((m) => m.id === santaId)!.name;
  return { santa: ids.get(santaId)!, giftee: ids.get(gifteeId)!, santaId, santaName, ann };
};

test('posted, then arrived: the Santa sees it arrived, the giftee never who, the organizer names only', async ({ signIn, db }) => {
  const people = await Promise.all(['ann', 'bob', 'cee', 'dan'].map((name) => signIn(name)));
  const group = await groupOf(people, 'By post');
  const at = { groupSlug: group.slug, editionNumber: 1 };
  ok(await people[0].trpc.mutate('draw.run', at));
  const { santa, giftee, santaId, santaName, ann } = await pairOf(db, group.slug, people);

  await test.step('nothing to post before the gift is marked', async () => {
    expect(ok(await santa.trpc.query('gift.mine', at)).post).toEqual({ posted: false, arrived: false });
    expect(code(await santa.trpc.mutate('gift.setPosted', { ...at, posted: true }))).toBe('NOT_FOUND');
    expect(ok(await giftee.trpc.query('gift.arrival', at))).toEqual({ posted: false, arrived: false });
    expect(code(await giftee.trpc.mutate('gift.setArrived', { ...at, arrived: true }))).toBe('NOT_FOUND');
    expect(ok(await ann.trpc.query('gift.stillShopping', at))!.notPosted).toEqual(['Ann', 'Bob', 'Cee', 'Dan']);
  });

  await test.step('the Santa posts it; the giftee sees it is on its way, not from whom', async () => {
    ok(await santa.trpc.mutate('gift.set', { ...at, wishIds: [], lines: ['A scarf'] }));
    expect(ok(await santa.trpc.mutate('gift.setPosted', { ...at, posted: true }))).toEqual({ posted: true });
    expect(ok(await santa.trpc.query('gift.mine', at)).post).toEqual({ posted: true, arrived: false });
    const arrival = ok(await giftee.trpc.query('gift.arrival', at));
    expect(arrival).toEqual({ posted: true, arrived: false });
    expect(JSON.stringify(arrival)).not.toContain(santaId);
    const shopping = ok(await ann.trpc.query('gift.stillShopping', at))!;
    expect(Object.keys(shopping).toSorted()).toEqual(['notPosted', 'santas', 'stillShopping']);
    expect(shopping.notPosted).toHaveLength(3);
    expect(shopping.notPosted).not.toContain(santaName);
    expect(JSON.stringify(shopping)).not.toContain('A scarf');
  });

  await test.step('the giftee says it arrived; the Santa sees it, the organizer does not', async () => {
    expect(ok(await giftee.trpc.mutate('gift.setArrived', { ...at, arrived: true }))).toEqual({ arrived: true });
    expect(ok(await santa.trpc.query('gift.mine', at)).post).toEqual({ posted: true, arrived: true });
    expect(ok(await giftee.trpc.query('gift.arrival', at))).toEqual({ posted: true, arrived: true });
    expect(JSON.stringify(ok(await ann.trpc.query('gift.stillShopping', at)))).not.toMatch(/arrived/i);
  });

  await test.step('nobody else sees or sets it', async () => {
    for (const person of people.filter((p) => p !== giftee)) {
      expect(ok(await person.trpc.query('gift.arrival', at)), 'their own gift, not posted').toEqual({ posted: false, arrived: false });
    }
  });

  await test.step('un-posting clears arrived; clearing the mark clears both', async () => {
    ok(await santa.trpc.mutate('gift.setPosted', { ...at, posted: false }));
    expect(ok(await giftee.trpc.query('gift.arrival', at))).toEqual({ posted: false, arrived: false });
    ok(await santa.trpc.mutate('gift.setPosted', { ...at, posted: true }));
    ok(await giftee.trpc.mutate('gift.setArrived', { ...at, arrived: true }));
    ok(await santa.trpc.mutate('gift.set', { ...at, wishIds: [], lines: [] }));
    expect(ok(await giftee.trpc.query('gift.arrival', at))).toEqual({ posted: false, arrived: false });
    expect(ok(await santa.trpc.query('gift.mine', at)).post).toEqual({ posted: false, arrived: false });
  });

  await test.step('in the export of each side', async () => {
    ok(await santa.trpc.mutate('gift.set', { ...at, wishIds: [], lines: ['A scarf'] }));
    ok(await santa.trpc.mutate('gift.setPosted', { ...at, posted: true }));
    ok(await giftee.trpc.mutate('gift.setArrived', { ...at, arrived: true }));
    const [marked] = ok(await santa.trpc.query('account.export')).giftsMarked;
    expect(marked.postedAt).toBeTruthy();
    expect(marked.arrivedAt).toBeTruthy();
    const received = ok(await giftee.trpc.query('account.export'));
    expect(received.giftsArrived).toHaveLength(1);
    expect(JSON.stringify(received)).not.toContain('A scarf');
  });

  await test.step('closed once the edition is done', async () => {
    const edition = await editionOf(db, group.slug);
    await db.editions.updateOne({ _id: edition._id }, { $set: { status: 'done' } });
    expect(code(await santa.trpc.mutate('gift.setPosted', { ...at, posted: false }))).toBe('EDITION_CLOSED');
    expect(code(await giftee.trpc.mutate('gift.setArrived', { ...at, arrived: false }))).toBe('EDITION_CLOSED');
    expect(ok(await giftee.trpc.query('gift.arrival', at))).toBeNull();
  });
});

test('in person: posted and arrived are refused; before the draw there is nothing', async ({ signIn, db }) => {
  const people = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const inPerson = await groupOf(people, 'In person', 'inPerson');
  const atPerson = { groupSlug: inPerson.slug, editionNumber: 1 };
  const byPost = await groupOf(people, 'Not drawn', 'both');
  const atPost = { groupSlug: byPost.slug, editionNumber: 1 };

  await test.step('before the draw', async () => {
    expect(ok(await people[1].trpc.query('gift.arrival', atPost))).toBeNull();
    expect(code(await people[1].trpc.mutate('gift.setArrived', { ...atPost, arrived: true }))).toBe('NOT_DRAWN');
    expect(code(await people[1].trpc.mutate('gift.setPosted', { ...atPost, posted: true }))).toBe('NOT_DRAWN');
  });

  ok(await people[0].trpc.mutate('draw.run', atPerson));
  const { santa, giftee, ann } = await pairOf(db, inPerson.slug, people);
  ok(await santa.trpc.mutate('gift.set', { ...atPerson, wishIds: [], lines: ['A scarf'] }));

  await test.step('in person', async () => {
    expect(ok(await santa.trpc.query('gift.mine', atPerson))).not.toHaveProperty('post');
    expect(code(await santa.trpc.mutate('gift.setPosted', { ...atPerson, posted: true }))).toBe('FORBIDDEN');
    expect(ok(await giftee.trpc.query('gift.arrival', atPerson))).toBeNull();
    expect(code(await giftee.trpc.mutate('gift.setArrived', { ...atPerson, arrived: true }))).toBe('FORBIDDEN');
    expect(ok(await ann.trpc.query('gift.stillShopping', atPerson))).not.toHaveProperty('notPosted');
  });
});

test('a video-call link on gift day: by post only, http(s) only, kept when gift day starts early', async ({ signIn, db }) => {
  const people = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const [ann] = people;
  const group = await groupOf(people, 'On the call');
  const at = { groupSlug: group.slug, editionNumber: 1 };
  const settings = { ...at, title: 'Secret Santa 2099', exchangeMode: 'byPost' as const, giftDay: { date: '2099-12-24', time: '19:00', callUrl: CALL } };
  const giftDayOf = async () => ok(await ann.trpc.query('group.get', { groupSlug: group.slug })).edition!.giftDay;

  ok(await ann.trpc.mutate('settings.updateEdition', settings));
  expect(await giftDayOf()).toEqual({ date: '2099-12-24', time: '19:00', callUrl: CALL });
  expect(code(await ann.trpc.mutate('settings.updateEdition', { ...settings, giftDay: { date: '2099-12-24', callUrl: 'javascript:alert(1)' } }))).toBe('INVALID_INPUT');
  expect(code(await ann.trpc.mutate('settings.updateEdition', { ...settings, giftDay: { date: '2099-12-24', callUrl: 'not a link' } }))).toBe('INVALID_INPUT');

  await test.step('dropped in person', async () => {
    ok(await ann.trpc.mutate('settings.updateEdition', { ...settings, exchangeMode: 'inPerson' }));
    expect(await giftDayOf()).toEqual({ date: '2099-12-24', time: '19:00' });
    ok(await ann.trpc.mutate('settings.updateEdition', settings));
  });

  await test.step('starting gift day today keeps the link, not the time', async () => {
    ok(await ann.trpc.mutate('draw.run', at));
    ok(await ann.trpc.mutate('manage.startGiftDay', at));
    const giftDay = await giftDayOf();
    expect(giftDay).toMatchObject({ callUrl: CALL });
    expect(giftDay).not.toHaveProperty('time');
    expect((await editionOf(db, group.slug)).giftDay?.callUrl).toBe(CALL);
  });
});
