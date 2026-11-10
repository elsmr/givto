// Draw notices go out with the draw (68): "Names are drawn" and "You have a new giftee" arrive
// right after draw.run, a late joiner, someone leaving, a re-draw or a scheduled draw, without
// any cron call (the `api` project never runs the crons).
import { expect, mailsTo, ok, test, type TestDb, type User } from '../fixtures';
import { createGroup, editionOf, join } from './s4-group';

const expectMails = (user: User, kind: string, count: number) =>
  expect.poll(async () => (await mailsTo(user.email, kind)).length, { message: `${kind} mails to ${user.email}` }).toBe(count);

/** Every Santa's current giftee has its notice logged: nothing left for the cron. */
const expectAllNotified = async (db: TestDb, slug: string) => {
  const { _id, draw } = await editionOf(db, slug, 1);
  const keys = Object.entries(draw!.assignments).map(([santa, giftee]) => `drawn:${_id}:${santa}:${giftee}`);
  await expect.poll(() => db.sentNotifications.countDocuments({ _id: { $in: keys } }), { message: 'draw notices logged' }).toBe(keys.length);
};

test('names-drawn email arrives right after draw.run, without any cron call', async ({ signIn, db }) => {
  const [ann, bob, cee] = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const group = await createGroup(ann, 'Notices');
  for (const [person, name] of [[bob, 'Bob'], [cee, 'Cee']] as const) await join(person, group, name);
  ok(await ann.trpc.mutate('draw.run', { groupSlug: group.slug, editionNumber: 1 }));
  for (const user of [ann, bob, cee]) await expectMails(user, 'namesDrawn', 1);
  await expectAllNotified(db, group.slug);
});

test('late joiner, leaver and re-draw: changed Santas hear it right away', async ({ signIn, db }) => {
  const [ann, bob, cee, dan] = await Promise.all(['ann', 'bob', 'cee', 'dan'].map((name) => signIn(name)));
  const group = await createGroup(ann, 'Changes');
  for (const [person, name] of [[bob, 'Bob'], [cee, 'Cee']] as const) await join(person, group, name);
  const edition1 = { groupSlug: group.slug, editionNumber: 1 };
  ok(await ann.trpc.mutate('draw.run', edition1));
  await expectAllNotified(db, group.slug);
  /** The person who gives to `user`. */
  const santaOf = async (user: User) => {
    const { members } = (await db.groups.findOne({ slug: group.slug }))!;
    const gifteeId = members.find((m) => m.userId === user.id)!.id;
    const santaId = Object.entries((await editionOf(db, group.slug, 1)).draw!.assignments).find(([, giftee]) => giftee === gifteeId)![0];
    return [ann, bob, cee, dan].find((person) => person.id === members.find((m) => m.id === santaId)!.userId)!;
  };

  await test.step('a late joiner gets "names drawn", the Santa who now gives to them "new giftee"', async () => {
    await join(dan, group, 'Dan');
    await expectMails(dan, 'namesDrawn', 1);
    await expectMails(await santaOf(dan), 'gifteeChanged', 1);
    await expectAllNotified(db, group.slug);
  });

  await test.step('someone leaves: the Santa who gave to them hears about the new giftee', async () => {
    // One circle of four (three drawn, Dan slotted in): Bob's Santa now gives to Bob's giftee, someone new to them.
    const santa = await santaOf(bob);
    const before = (await mailsTo(santa.email, 'gifteeChanged')).length;
    ok(await bob.trpc.mutate('membership.leave', { groupSlug: group.slug }));
    await expectMails(santa, 'gifteeChanged', before + 1);
    await expectAllNotified(db, group.slug);
  });

  await test.step('re-draw: every new pair is notified', async () => {
    ok(await ann.trpc.mutate('draw.redraw', edition1));
    await expectAllNotified(db, group.slug);
  });
});

test('a scheduled draw mails right away', async ({ signIn, db }) => {
  const [ann, bob, cee] = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const group = await createGroup(ann, 'Scheduled');
  for (const [person, name] of [[bob, 'Bob'], [cee, 'Cee']] as const) await join(person, group, name);
  const { _id } = await editionOf(db, group.slug, 1);
  await db.editions.updateOne({ _id }, { $set: { drawAt: new Date('2099-12-01T00:00:00Z') } });
  expect(ok(await ann.trpc.mutate('draw.runDue', { now: '2099-12-01T00:00:00.000Z', editionIds: [_id] })).drawn).toEqual([_id]);
  for (const user of [ann, bob, cee]) await expectMails(user, 'namesDrawn', 1);
  await expectAllNotified(db, group.slug);
});
