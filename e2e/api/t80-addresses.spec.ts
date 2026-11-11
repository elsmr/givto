// Postal addresses (80): an address book on the account, one picked per group (else the default). Only the
// assigned Santa reads it, in by-post editions, from the draw until gift day is over; the organizer only
// sees who has none.
import enEmail from '@/messages/en/email.json' with { type: 'json' };
import { expect, mailsTo, ok, test, type TestDb, type User } from '../fixtures';
import { code, editionOf } from './s6-helpers';

const home = { recipient: 'Bob Builder', lines: ['Bobstraat 12', 'Bus 3'], postalCode: '1000', city: 'Brussel', country: 'BE' as const };
const work = { lines: ['Werkplein 1'], postalCode: '2000', city: 'Antwerpen', country: 'BE' as const };

const groupOf = async ([ann, ...others]: User[], name: string, exchangeMode: 'byPost' | 'inPerson' = 'byPost') => {
  const group = ok(await ann.trpc.mutate('group.create', { name, organizerName: 'Ann', timeZone: 'Europe/Brussels', giftDay: { date: '2099-12-24' }, exchangeMode }));
  for (const [i, person] of others.entries()) {
    ok(await person.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name: ['Bob', 'Cee', 'Dan'][i] }));
  }
  return group;
};

const santaOf = async (db: TestDb, slug: string, people: User[], giftee: User) => {
  const edition = await editionOf(db, slug);
  const { members } = (await db.groups.findOne({ slug }))!;
  const idOf = (user: User) => members.find((m) => m.userId === user.id)!.id;
  return people.find((person) => edition.draw!.assignments[idOf(person)] === idOf(giftee))!;
};

test('one account address serves every group; only the Santa in a by-post edition reads it, from the draw until gift day is over', async ({ signIn, db }) => {
  const people = await Promise.all(['ann', 'bob', 'cee', 'dan'].map((name) => signIn(name)));
  const [ann, bob, cee] = people;
  const byPost = await groupOf(people, 'By post');
  const inPerson = await groupOf(people, 'In person', 'inPerson');
  const [atPost, atPerson] = [byPost, inPerson].map((group) => ({ groupSlug: group.slug, editionNumber: 1 }));

  await test.step('my address book is my own', async () => {
    expect(code(await bob.trpc.mutate('account.addAddress', { address: { ...home, country: 'XX' } } as never))).toBe('INVALID_INPUT');
    expect(code(await bob.trpc.mutate('account.addAddress', { address: { ...home, lines: [] } }))).toBe('INVALID_INPUT');
    const { id } = ok(await bob.trpc.mutate('account.addAddress', { address: home }));
    expect(ok(await bob.trpc.query('account.addresses'))).toEqual({ addresses: [{ id, ...home }], defaultAddressId: id });
    expect(ok(await cee.trpc.query('account.addresses'))).toEqual({ addresses: [], defaultAddressId: null });
    for (const group of [byPost, inPerson]) expect(ok(await bob.trpc.query('address.mine', { groupSlug: group.slug }))).toEqual({ address: { id, ...home }, pickedId: null });
  });

  await test.step('before the draw nobody reads it; the organizer gets names only', async () => {
    for (const person of people) expect(ok(await person.trpc.query('address.giftee', atPost))).toBeNull();
    expect(ok(await ann.trpc.query('address.missing', atPost))).toEqual({ people: 4, missing: ['Ann', 'Cee', 'Dan'] });
    expect(ok(await ann.trpc.query('address.missing', atPerson))).toBeNull();
    expect(code(await bob.trpc.query('address.missing', atPost))).toBe('NOT_ORGANIZER');
    const seen = JSON.stringify([ok(await ann.trpc.query('address.missing', atPost)), ok(await ann.trpc.query('group.get', { groupSlug: byPost.slug }))]);
    expect(seen).not.toContain('Bobstraat');
  });

  ok(await ann.trpc.mutate('draw.run', atPost));
  ok(await ann.trpc.mutate('draw.run', atPerson));
  const bobsSanta = await santaOf(db, byPost.slug, people, bob);

  await test.step('after the draw: Bob’s Santa in the by-post group gets it, nobody else, and nobody in the in-person group', async () => {
    expect(ok(await bobsSanta.trpc.query('address.giftee', atPost))).toEqual({ name: 'Bob', address: home });
    for (const person of people.filter((p) => p !== bobsSanta)) {
      expect(JSON.stringify(ok(await person.trpc.query('address.giftee', atPost)))).not.toContain('Bobstraat');
    }
    for (const person of people) expect(ok(await person.trpc.query('address.giftee', atPerson))).toBeNull();
  });

  await test.step('the names-drawn email asks those without an address to add one, only in the by-post group', async () => {
    const drawnMails = async (user: User, group: string) => (await mailsTo(user.email, 'namesDrawn')).filter((mail) => mail.subject.includes(group));
    await expect.poll(async () => (await drawnMails(cee, 'By post')).length).toBe(1);
    expect((await drawnMails(cee, 'By post'))[0].text).toContain(enEmail['names-drawn'].address);
    await expect.poll(async () => (await drawnMails(cee, 'In person')).length).toBe(1);
    expect((await drawnMails(cee, 'In person'))[0].text).not.toContain(enEmail['names-drawn'].address);
    await expect.poll(async () => (await drawnMails(bob, 'By post')).length).toBe(1);
    expect((await drawnMails(bob, 'By post'))[0].text).not.toContain(enEmail['names-drawn'].address);
  });

  await test.step('still there on gift day, gone once it is over', async () => {
    const edition = await editionOf(db, byPost.slug);
    await db.editions.updateOne({ _id: edition._id }, { $set: { status: 'giftday' } });
    expect(ok(await bobsSanta.trpc.query('address.giftee', atPost))).toEqual({ name: 'Bob', address: home });
    expect(ok(await ann.trpc.query('address.missing', atPost))).toBeNull();
    await db.editions.updateOne({ _id: edition._id }, { $set: { status: 'done' } });
    expect(ok(await bobsSanta.trpc.query('address.giftee', atPost))).toBeNull();
  });
});

test('a second address picked for one group; removing it falls back to the default; only my own addresses', async ({ signIn, db }) => {
  const people = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const [ann, bob, cee] = people;
  const [groupA, groupB] = [await groupOf(people, 'Group A'), await groupOf(people, 'Group B')];
  const [atA, atB] = [groupA, groupB].map((group) => ({ groupSlug: group.slug, editionNumber: 1 }));
  const { id: homeId } = ok(await bob.trpc.mutate('account.addAddress', { address: home }));
  const { id: workId } = ok(await bob.trpc.mutate('account.addAddress', { address: work }));
  const { id: ceeId } = ok(await cee.trpc.mutate('account.addAddress', { address: home }));

  await test.step('someone else’s address is refused everywhere', async () => {
    expect(code(await bob.trpc.mutate('address.pick', { groupSlug: groupB.slug, addressId: ceeId }))).toBe('NOT_FOUND');
    expect(code(await bob.trpc.mutate('account.updateAddress', { id: ceeId, address: work }))).toBe('NOT_FOUND');
    expect(code(await bob.trpc.mutate('account.removeAddress', { id: ceeId }))).toBe('NOT_FOUND');
    expect(code(await bob.trpc.mutate('account.setDefaultAddress', { id: ceeId }))).toBe('NOT_FOUND');
    expect(ok(await cee.trpc.query('account.addresses'))).toEqual({ addresses: [{ id: ceeId, ...home }], defaultAddressId: ceeId });
  });

  await test.step('at most 10', async () => {
    for (let i = 1; i < 10; i++) ok(await cee.trpc.mutate('account.addAddress', { address: work }));
    expect(code(await cee.trpc.mutate('account.addAddress', { address: work }))).toBe('FORBIDDEN');
  });

  ok(await bob.trpc.mutate('address.pick', { groupSlug: groupB.slug, addressId: workId }));
  expect(ok(await bob.trpc.query('account.addresses')).defaultAddressId).toBe(homeId);
  expect(ok(await bob.trpc.query('address.mine', { groupSlug: groupB.slug }))).toEqual({ address: { id: workId, ...work }, pickedId: workId });
  for (const at of [atA, atB]) ok(await ann.trpc.mutate('draw.run', at));
  const [santaA, santaB] = [await santaOf(db, groupA.slug, people, bob), await santaOf(db, groupB.slug, people, bob)];

  await test.step('each group’s Santa gets that group’s address', async () => {
    expect(ok(await santaA.trpc.query('address.giftee', atA))!.address).toEqual(home);
    expect(ok(await santaB.trpc.query('address.giftee', atB))!.address).toEqual(work);
    ok(await bob.trpc.mutate('account.updateAddress', { id: workId, address: { ...work, lines: ['Werkplein 2'] } }));
    expect(ok(await santaB.trpc.query('address.giftee', atB))!.address).toEqual({ ...work, lines: ['Werkplein 2'] });
  });

  await test.step('removing the picked address: that group falls back to the default', async () => {
    ok(await bob.trpc.mutate('account.removeAddress', { id: workId }));
    expect(ok(await santaB.trpc.query('address.giftee', atB))!.address).toEqual(home);
    expect(ok(await bob.trpc.query('address.mine', { groupSlug: groupB.slug }))).toEqual({ address: { id: homeId, ...home }, pickedId: null });
  });

  await test.step('removing the default promotes the next one; none left, nothing to read', async () => {
    const { id: thirdId } = ok(await bob.trpc.mutate('account.addAddress', { address: work }));
    ok(await bob.trpc.mutate('account.removeAddress', { id: homeId }));
    expect(ok(await bob.trpc.query('account.addresses'))).toEqual({ addresses: [{ id: thirdId, ...work }], defaultAddressId: thirdId });
    expect(ok(await santaA.trpc.query('address.giftee', atA))!.address).toEqual(work);
    ok(await bob.trpc.mutate('account.removeAddress', { id: thirdId }));
    expect(ok(await bob.trpc.query('account.addresses'))).toEqual({ addresses: [], defaultAddressId: null });
    expect(ok(await santaA.trpc.query('address.giftee', atA))).toEqual({ name: 'Bob', address: null });
    expect(ok(await bob.trpc.query('address.mine', { groupSlug: groupA.slug }))).toBeNull();
  });
});

test('a reminder 14 days before gift day, only to those without an address', async ({ signIn, db }) => {
  const people = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const [, bob, cee] = people;
  const group = await groupOf(people, 'Remind me');
  for (const person of people) ok(await person.trpc.mutate('wish.create', { title: 'Something', groupSlugs: [group.slug] }));
  ok(await bob.trpc.mutate('account.addAddress', { address: home }));
  ok(await bob.trpc.mutate('reminders.runDue', { now: '2099-12-10T10:00:00.000Z', editionIds: [(await editionOf(db, group.slug))._id] }));
  const [reminder] = await mailsTo(cee.email, 'reminderAddress');
  expect(reminder.subject).toBe(`${enEmail.reminder.address.subject} · Remind me`);
  expect(await mailsTo(bob.email, 'reminderAddress')).toHaveLength(0);
});
