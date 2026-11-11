// Postal addresses (80): only in editions that send gifts by post; only the assigned Santa reads one,
// from the draw on; the organizer only sees who hasn't added one; in person, nothing at all.
import enEmail from '@/messages/en/email.json' with { type: 'json' };
import { expect, mailsTo, ok, test, type User } from '../fixtures';
import { code, editionOf } from './s6-helpers';

const address = { recipient: 'Bob Builder', lines: ['Bobstraat 12', 'Bus 3'], postalCode: '1000', city: 'Brussel', country: 'BE' as const };

const postedGroup = async ([ann, ...others]: User[], name: string, exchangeMode: 'byPost' | 'inPerson' = 'byPost') => {
  const group = ok(await ann.trpc.mutate('group.create', { name, organizerName: 'Ann', timeZone: 'Europe/Brussels', giftDay: { date: '2099-12-24' }, exchangeMode }));
  for (const [i, person] of others.entries()) {
    ok(await person.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name: ['Bob', 'Cee', 'Dan'][i] }));
  }
  return group;
};

test('only the assigned Santa reads the address, from the draw on; the organizer only who is missing', async ({ signIn, db }) => {
  const people = await Promise.all(['ann', 'bob', 'cee', 'dan'].map((name) => signIn(name)));
  const [ann, bob, cee] = people;
  const group = await postedGroup(people, 'By post');
  const at = { groupSlug: group.slug, editionNumber: 1 };

  await test.step('before the draw: my own address only; nobody reads anyone else’s', async () => {
    expect(code(await bob.trpc.mutate('address.set', { ...at, address: { ...address, country: 'XX' } } as never))).toBe('INVALID_INPUT');
    expect(code(await bob.trpc.mutate('address.set', { ...at, address: { ...address, lines: [] } }))).toBe('INVALID_INPUT');
    ok(await bob.trpc.mutate('address.set', { ...at, address }));
    expect(ok(await bob.trpc.query('address.mine', at))).toEqual(address);
    expect(ok(await cee.trpc.query('address.mine', at))).toBeNull();
    for (const person of people) expect(ok(await person.trpc.query('address.giftee', at))).toBeNull();
  });

  await test.step('the organizer gets names only', async () => {
    expect(ok(await ann.trpc.query('address.missing', at))).toEqual({ people: 4, missing: ['Ann', 'Cee', 'Dan'] });
    expect(code(await bob.trpc.query('address.missing', at))).toBe('NOT_ORGANIZER');
    const seen = JSON.stringify([ok(await ann.trpc.query('address.missing', at)), ok(await ann.trpc.query('group.get', { groupSlug: group.slug }))]);
    expect(seen).not.toContain('Bobstraat');
  });

  ok(await ann.trpc.mutate('draw.run', at));
  const edition = await editionOf(db, group.slug);
  const { members } = (await db.groups.findOne({ slug: group.slug }))!;
  const idOf = (user: User) => members.find((m) => m.userId === user.id)!.id;
  const bobsSanta = people.find((person) => edition.draw!.assignments[idOf(person)] === idOf(bob))!;

  await test.step('after the draw: Bob’s Santa gets it, nobody else does', async () => {
    expect(ok(await bobsSanta.trpc.query('address.giftee', at))).toEqual({ name: 'Bob', address });
    for (const person of people.filter((p) => p !== bobsSanta)) {
      const giftee = ok(await person.trpc.query('address.giftee', at))!;
      expect(giftee.address).toBeNull();
      expect(JSON.stringify(giftee)).not.toContain('Bobstraat');
    }
  });

  await test.step('the names-drawn email asks those without an address to add one', async () => {
    await expect.poll(async () => (await mailsTo(cee.email, 'namesDrawn')).length).toBe(1);
    expect((await mailsTo(cee.email, 'namesDrawn'))[0].text).toContain(enEmail['names-drawn'].address);
    await expect.poll(async () => (await mailsTo(bob.email, 'namesDrawn')).length).toBe(1);
    expect((await mailsTo(bob.email, 'namesDrawn'))[0].text).not.toContain(enEmail['names-drawn'].address);
  });

  await test.step('removing it takes it from the Santa; from gift day on it can’t change', async () => {
    ok(await bob.trpc.mutate('address.clear', at));
    expect(ok(await bobsSanta.trpc.query('address.giftee', at))).toEqual({ name: 'Bob', address: null });
    expect(ok(await ann.trpc.query('address.missing', at))!.missing).toContain('Bob');
    await db.editions.updateOne({ _id: edition._id }, { $set: { status: 'giftday' } });
    expect(code(await bob.trpc.mutate('address.set', { ...at, address }))).toBe('EDITION_CLOSED');
    expect(ok(await ann.trpc.query('address.missing', at))).toBeNull();
  });
});

test('in person: setting one is refused and nothing comes back', async ({ signIn, db }) => {
  const people = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const [ann, bob] = people;
  const group = await postedGroup(people, 'In person', 'inPerson');
  const at = { groupSlug: group.slug, editionNumber: 1 };
  expect(code(await bob.trpc.mutate('address.set', { ...at, address }))).toBe('FORBIDDEN');
  ok(await ann.trpc.mutate('draw.run', at));
  const edition = await editionOf(db, group.slug);
  await db.editions.updateOne({ _id: edition._id }, { $set: { 'participants.$[].address': address } });
  for (const person of people) {
    expect(ok(await person.trpc.query('address.mine', at))).toBeNull();
    expect(ok(await person.trpc.query('address.giftee', at))).toBeNull();
  }
  expect(ok(await ann.trpc.query('address.missing', at))).toBeNull();
  expect(code(await bob.trpc.mutate('address.clear', at))).toBe('FORBIDDEN');
});

test('a reminder 14 days before gift day, only to those without an address', async ({ signIn, db }) => {
  const people = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const [, bob, cee] = people;
  const group = await postedGroup(people, 'Remind me');
  const at = { groupSlug: group.slug, editionNumber: 1 };
  for (const person of people) ok(await person.trpc.mutate('wish.create', { title: 'Something', groupSlugs: [group.slug] }));
  ok(await bob.trpc.mutate('address.set', { ...at, address }));
  ok(await bob.trpc.mutate('reminders.runDue', { now: '2099-12-10T10:00:00.000Z', editionIds: [(await editionOf(db, group.slug))._id] }));
  const [reminder] = await mailsTo(cee.email, 'reminderAddress');
  expect(reminder.subject).toBe(`${enEmail.reminder.address.subject} · Remind me`);
  expect(await mailsTo(bob.email, 'reminderAddress')).toHaveLength(0);
});

test('only people in the edition can add one', async ({ signIn, db }) => {
  const people = await Promise.all(['ann', 'bob', 'cee', 'dan'].map((name) => signIn(name)));
  const [ann, bob, , dan] = people;
  const outsider = await signIn('eve');
  const group = await postedGroup(people, 'Sitting out');
  const at = { groupSlug: group.slug, editionNumber: 1 };
  const edition = await editionOf(db, group.slug);
  const { members } = (await db.groups.findOne({ slug: group.slug }))!;
  const danId = members.find((m) => m.userId === dan.id)!.id;
  ok(await ann.trpc.mutate('settings.setParticipants', { ...at, memberIds: members.filter((m) => m.id !== danId).map((m) => m.id) }));
  expect(code(await dan.trpc.mutate('address.set', { ...at, address }))).toBe('FORBIDDEN');
  expect(code(await outsider.trpc.mutate('address.set', { ...at, address }))).toBe('GROUP_NOT_FOUND');
  expect(code(await outsider.trpc.query('address.mine', at))).toBe('GROUP_NOT_FOUND');
  expect(ok(await ann.trpc.query('address.missing', at))).toEqual({ people: 3, missing: ['Ann', 'Bob', 'Cee'] });
  expect((await db.editions.findOne({ _id: edition._id }))!.participants.some((p) => p.address)).toBe(false);
  ok(await bob.trpc.mutate('address.set', { ...at, address }));
});
