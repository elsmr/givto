// The organizer's escape hatches (64): start gift day now, finish it, back to shopping, reopen.
import { addDays, todayIn } from '@/lib/local-date';
import { expect, ok, test, type User } from '../fixtures';
import { code, drawnGroup, editionOf, memberIdOf } from './s6-helpers';

const TZ = 'Europe/Brussels';
type Hatch = 'manage.startGiftDay' | 'manage.finishGiftDay' | 'manage.reopenGiftDay';

/** A member gets 403 NOT_ORGANIZER, someone outside the group GROUP_NOT_FOUND, and nothing changes. */
const expectOrganizerOnly = async (call: (user: User) => Promise<{ status: number; error?: { data: { appCode?: string } } }>, member: User, outsider: User) => {
  const refused = await call(member);
  expect(refused.status).toBe(403);
  expect(code(refused)).toBe('NOT_ORGANIZER');
  expect(code(await call(outsider))).toBe('GROUP_NOT_FOUND');
};

const tomorrowNoon = (today: string) => `${addDays(today, 1)}T12:00:00.000Z`;

test('start gift day now: organizer only, today, unwrap order, nothing revealed', async ({ signIn, db }) => {
  const [ann, bob, cee, dan, zed] = await Promise.all(['ann', 'bob', 'cee', 'dan', 'zed'].map((name) => signIn(name)));
  const group = await drawnGroup([ann, bob, cee, dan], 'Start now');
  const edition = { groupSlug: group.slug, editionNumber: 1 };
  const start = (user: User) => user.trpc.mutate('manage.startGiftDay', edition);
  const { _id: editionId } = await editionOf(db, group.slug);
  await db.editions.updateOne(
    { _id: editionId },
    { $set: { 'giftDay.time': '18:00', 'giftDay.place': "Grandma's", wishlistBy: '2099-12-01', postBy: '2099-12-20' } }
  );

  await expectOrganizerOnly(start, bob, zed);
  expect((await editionOf(db, group.slug)).status).toBe('drawn');
  const open = ok(await ann.trpc.mutate('group.create', { name: 'Not drawn', organizerName: 'Ann', timeZone: TZ, exchangeMode: 'inPerson' }));
  expect(code(await ann.trpc.mutate('manage.startGiftDay', { groupSlug: open.slug, editionNumber: 1 }))).toBe('NOT_DRAWN');

  ok(await start(ann));
  const today = todayIn(TZ);
  const started = await editionOf(db, group.slug);
  expect(started.status).toBe('giftday');
  expect(started.statusChangedAt.giftday).toBeInstanceOf(Date);
  // The 18:00 was for another day; the place still holds. Deadlines can't be after gift day.
  expect(started.giftDay).toEqual({ date: today, place: "Grandma's" });
  expect([started.wishlistBy, started.postBy]).toEqual([today, today]);
  expect(started.calendarSequence).toBe(1);
  expect(started.unwrapOrder!.memberIds.toSorted()).toEqual(Object.keys(started.draw!.assignments).toSorted());
  expect(code(await start(ann)), 'twice').toBe('EDITION_CHANGED');

  // Everyone sees gift day; who drew whom stays secret (reveal off).
  const bobsGroups = ok(await bob.trpc.query('account.groups'));
  expect(bobsGroups.find((g) => g.slug === group.slug)!.todos.map((t) => t.kind)).toContain('giftDay');
  const view = ok(await bob.trpc.query('giftday.get', edition));
  expect(view.reveal.pairs).toBeNull();
  expect(JSON.stringify(view)).not.toContain('santa');

  // The scheduled job keeps it on gift day today and finishes it tomorrow.
  expect(ok(await ann.trpc.mutate('giftday.runDue', { editionIds: [editionId] })).done).not.toContain(editionId);
  expect(ok(await ann.trpc.mutate('giftday.runDue', { now: tomorrowNoon(today), editionIds: [editionId] })).done).toContain(editionId);
});

test('start gift day now without a gift day date, keeping a shuffled unwrap order', async ({ signIn, db }) => {
  const [ann, bob, cee] = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const group = await drawnGroup([ann, bob, cee], 'No date');
  const edition = { groupSlug: group.slug, editionNumber: 1 };
  const { _id: editionId } = await editionOf(db, group.slug);
  await db.editions.updateOne({ _id: editionId }, { $unset: { giftDay: true } });
  ok(await ann.trpc.mutate('giftday.shuffle', edition));
  const shuffled = (await editionOf(db, group.slug)).unwrapOrder!;

  ok(await ann.trpc.mutate('manage.startGiftDay', edition));
  const started = await editionOf(db, group.slug);
  expect(started.giftDay).toEqual({ date: todayIn(TZ) });
  expect(started.unwrapOrder).toEqual(shuffled);
});

test('finish gift day: organizer only, done now, edition closes, mark what you got', async ({ signIn, db }) => {
  const [ann, bob, cee, zed] = await Promise.all(['ann', 'bob', 'cee', 'zed'].map((name) => signIn(name)));
  const group = await drawnGroup([ann, bob, cee], 'Finish');
  const edition = { groupSlug: group.slug, editionNumber: 1 };
  const finish = (user: User) => user.trpc.mutate('manage.finishGiftDay', edition);
  ok(await bob.trpc.mutate('wish.create', { title: 'Warm socks', groupSlugs: [group.slug] }));
  const ceeId = await memberIdOf(db, group.slug, cee);
  const tip = { ...edition, aboutMemberId: ceeId, text: 'Loves tea', anonymous: false };

  expect(code(await finish(ann)), 'still shopping').toBe('NOT_GIFT_DAY');
  ok(await ann.trpc.mutate('manage.startGiftDay', edition));
  await expectOrganizerOnly(finish, bob, zed);
  expect((await editionOf(db, group.slug)).status).toBe('giftday');
  ok(await bob.trpc.mutate('tip.create', tip));

  ok(await finish(ann));
  const done = await editionOf(db, group.slug);
  expect(done.status).toBe('done');
  expect(done.statusChangedAt.done).toBeInstanceOf(Date);
  expect(code(await finish(ann)), 'twice').toBe('EDITION_CHANGED');
  expect(code(await bob.trpc.mutate('tip.create', tip))).toBe('EDITION_CLOSED');
  const todos = ok(await bob.trpc.query('account.groups')).find((g) => g.slug === group.slug)!.todos;
  expect(todos.map((t) => t.kind)).toEqual(['markReceived']);
  expect(ok(await bob.trpc.query('giftday.get', edition)).reveal.pairs).toBeNull();
  // Same again next year is open now.
  ok(await ann.trpc.mutate('edition.startNext', { groupSlug: group.slug }));
});

test('back to shopping: organizer only, new date, not once anything is unwrapped or revealed', async ({ signIn, db }) => {
  const [ann, bob, cee, zed] = await Promise.all(['ann', 'bob', 'cee', 'zed'].map((name) => signIn(name)));
  const group = await drawnGroup([ann, bob, cee], 'Back');
  const edition = { groupSlug: group.slug, editionNumber: 1 };
  const back = (user: User, giftDayDate = '2099-12-26') => user.trpc.mutate('manage.backToShopping', { ...edition, giftDayDate });
  const { _id: editionId } = await editionOf(db, group.slug);
  const today = todayIn(TZ);

  expect(code(await back(ann)), 'still shopping').toBe('NOT_GIFT_DAY');
  ok(await ann.trpc.mutate('manage.startGiftDay', edition));
  await expectOrganizerOnly((user) => back(user), bob, zed);
  expect(code(await back(ann, today)), 'today would start it again').toBe('DATE_IN_PAST');

  await test.step('refused once a Santa was shown (62), someone unwrapped, or the big reveal is out', async () => {
    ok(await ann.trpc.mutate('giftday.advance', { ...edition, action: 'start', turnsTaken: 0 }));
    ok(await ann.trpc.mutate('giftday.advance', { ...edition, action: 'spin', turnsTaken: 0 }));
    ok(await ann.trpc.mutate('giftday.advance', { ...edition, action: 'santa', turnsTaken: 0 }));
    expect(code(await back(ann))).toBe('GIFT_DAY_UNDERWAY');
    ok(await ann.trpc.mutate('giftday.advance', { ...edition, action: 'last', turnsTaken: 0 }));
    expect(code(await back(ann))).toBe('GIFT_DAY_UNDERWAY');
    ok(await ann.trpc.mutate('giftday.advance', { ...edition, action: 'back', turnsTaken: 1 }));
    ok(await ann.trpc.mutate('giftday.advance', { ...edition, action: 'back', turnsTaken: 0 }));

    ok(await ann.trpc.mutate('giftday.setReveal', { ...edition, enabled: true }));
    ok(await ann.trpc.mutate('giftday.reveal', edition));
    expect(code(await back(ann))).toBe('GIFT_DAY_UNDERWAY');
    await db.editions.updateOne({ _id: editionId }, { $set: { reveal: { enabled: true } } });
  });

  // A gift day morning reminder went out for today; another edition's log stays.
  const bobId = await memberIdOf(db, group.slug, bob);
  const sent = { kind: 'reminderGiftDay', editionId, memberId: bobId, sentAt: new Date() };
  const otherKey = `reminder:giftday:${'f'.repeat(24)}:${bobId}`;
  await db.sentNotifications.insertMany([{ _id: `reminder:giftday:${editionId}:${bobId}`, ...sent }, { _id: otherKey, ...sent }]);
  const before = await editionOf(db, group.slug);

  ok(await back(ann));
  const shopping = await editionOf(db, group.slug);
  expect(shopping.status).toBe('drawn');
  expect(shopping.statusChangedAt.giftday).toBeUndefined();
  expect(shopping.giftDay!.date).toBe('2099-12-26');
  expect(shopping.calendarSequence).toBe((before.calendarSequence ?? 0) + 1);
  // The order stays (members never see it ahead); the presenter starts over.
  expect(shopping.unwrapOrder!.memberIds).toEqual(before.unwrapOrder!.memberIds);
  expect(shopping.unwrapOrder!.progress).toBeUndefined();
  expect(shopping.reveal).toEqual({ enabled: true });
  expect(await db.sentNotifications.countDocuments({ _id: { $regex: `^reminder:giftday:${editionId}:` } })).toBe(0);
  expect(await db.sentNotifications.countDocuments({ _id: otherKey })).toBe(1);
  const todos = ok(await bob.trpc.query('account.groups')).find((g) => g.slug === group.slug)!.todos;
  expect(todos.map((t) => t.kind)).not.toContain('giftDay');
  expect(ok(await bob.trpc.query('giftday.get', edition)).reveal.pairs).toBeNull();
  expect(ok(await ann.trpc.mutate('giftday.runDue', { editionIds: [editionId] })).giftday).not.toContain(editionId);
});

test('reopen gift day: organizer only, until tonight, latest edition with a draw only', async ({ signIn, db }) => {
  const [ann, bob, cee, zed] = await Promise.all(['ann', 'bob', 'cee', 'zed'].map((name) => signIn(name)));
  const group = await drawnGroup([ann, bob, cee], 'Reopen');
  const edition = { groupSlug: group.slug, editionNumber: 1 };
  const reopen = (user: User) => user.trpc.mutate('manage.reopenGiftDay', edition);
  const call = (hatch: Hatch) => ann.trpc.mutate(hatch, edition);
  const { _id: editionId } = await editionOf(db, group.slug);
  const today = todayIn(TZ);
  const tip = { ...edition, aboutMemberId: await memberIdOf(db, group.slug, cee), text: 'Forgot this one', anonymous: true };

  expect(code(await reopen(ann)), 'still shopping').toBe('NOT_GIFT_DAY');
  // Done by the date a few days ago, with its order already shuffled.
  ok(await call('manage.startGiftDay'));
  ok(await call('manage.finishGiftDay'));
  await db.editions.updateOne({ _id: editionId }, { $set: { 'giftDay.date': addDays(today, -3) } });
  const done = await editionOf(db, group.slug);
  await expectOrganizerOnly(reopen, bob, zed);
  expect(code(await bob.trpc.mutate('tip.create', tip))).toBe('EDITION_CLOSED');

  ok(await reopen(ann));
  const reopened = await editionOf(db, group.slug);
  expect(reopened.status).toBe('giftday');
  expect(reopened.statusChangedAt.done).toBeUndefined();
  expect(reopened.giftDay!.date).toBe(today);
  expect(reopened.unwrapOrder).toEqual(done.unwrapOrder);
  expect(reopened.reveal).toEqual(done.reveal);
  ok(await bob.trpc.mutate('tip.create', tip));
  expect(ok(await bob.trpc.query('giftday.get', edition)).reveal.pairs).toBeNull();
  expect(ok(await ann.trpc.mutate('giftday.runDue', { now: tomorrowNoon(today), editionIds: [editionId] })).done).toContain(editionId);

  await test.step('not without the draw (retention), not once a next edition exists', async () => {
    await db.editions.updateOne({ _id: editionId }, { $unset: { draw: true } });
    expect(code(await reopen(ann))).toBe('NOT_DRAWN');
    ok(await ann.trpc.mutate('edition.startNext', { groupSlug: group.slug }));
    expect(code(await reopen(ann))).toBe('EDITION_CLOSED');
  });
});
