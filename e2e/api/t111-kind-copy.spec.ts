// 111: emails name the game, and a re-draw someone's leaving forced isn't put on the organizer.
import { expect, latestMail, ok, test, uniqueEmail, type User } from '../fixtures';
import { editionOf, memberIdOf } from './s6-helpers';

const TZ = 'Europe/Brussels';

const create = async (ann: User, name: string, kind: 'whiteElephant' | 'conspiracy') =>
  ok(await ann.trpc.mutate('group.create', { name, organizerName: 'Ann', timeZone: TZ, giftDay: { date: '2099-12-24' }, exchangeMode: 'inPerson', kind }));

test('the invite and "you\'re in" emails name the White Elephant or Conspiracy Santa, without Santas or a draw', async ({ signIn, db }) => {
  const [ann, bob] = await Promise.all(['ann', 'bob'].map((name) => signIn(name)));

  await test.step('invite to a White Elephant', async () => {
    const swap = await create(ann, 'Swap', 'whiteElephant');
    const fay = uniqueEmail('fay');
    ok(await ann.trpc.mutate('invite.send', { groupSlug: swap.slug, email: fay }));
    const { text } = await latestMail(fay);
    expect(text).toContain('Ann invited you to the White Elephant “Swap”.');
    expect(text).toContain('Join the White Elephant');
    expect(text).not.toMatch(/Secret Santa|draw/);
  });

  await test.step('let into a Conspiracy Santa', async () => {
    const plot = await create(ann, 'Plot', 'conspiracy');
    ok(await ann.trpc.mutate('join.updateLink', { groupSlug: plot.slug, requiresApproval: true, maxMembers: null }));
    ok(await bob.trpc.mutate('join.accept', { groupSlug: plot.slug, token: plot.joinToken, name: 'Bob' }));
    ok(await ann.trpc.mutate('membership.approve', { groupSlug: plot.slug, memberId: await memberIdOf(db, plot.slug, bob) }));
    const { text } = await latestMail(bob.email, 'joined');
    expect(text).toContain('Add a few wishes so the others know what to get you.');
    expect(text).toContain("You're getting this email because you're in a group on Givto.");
    expect(text).not.toMatch(/Santa knows|Secret Santa/);
  });
});

test('someone leaving forces a re-draw: the Santas whose giftee changed hear someone left, not that the organizer drew again', async ({ signIn, db }) => {
  const [ann, bob, cee, dan, eve] = await Promise.all(['ann', 'bob', 'cee', 'dan', 'eve'].map((name) => signIn(name)));
  const group = ok(await ann.trpc.mutate('group.create', { name: 'Leaving', organizerName: 'Ann', timeZone: TZ, exchangeMode: 'inPerson' }));
  const { slug } = group;
  for (const [person, name] of [[bob, 'Bob'], [cee, 'Cee'], [dan, 'Dan'], [eve, 'Eve']] as const) ok(await person.trpc.mutate('join.accept', { groupSlug: slug, token: group.joinToken, name }));
  const id = Object.fromEntries(await Promise.all(Object.entries({ ann, bob, cee, dan, eve }).map(async ([name, user]) => [name, await memberIdOf(db, slug, user)])));
  ok(await ann.trpc.mutate('group.setKeepApart', { groupSlug: slug, households: [[id.ann, id.cee], [id.ann, id.dan]] }));
  const edition = { groupSlug: slug, editionNumber: 1 };
  ok(await ann.trpc.mutate('draw.run', edition));
  // Ann↔Bob and Cee→Dan→Eve→Cee: without Bob, Ann can't keep a giftee and no single swap works.
  const { _id } = await editionOf(db, slug);
  const layout = { [id.ann]: id.bob, [id.bob]: id.ann, [id.cee]: id.dan, [id.dan]: id.eve, [id.eve]: id.cee };
  await db.editions.updateOne({ _id }, { $set: { 'draw.assignments': layout } });
  // As if this was the draw everyone was told about.
  await db.sentNotifications.deleteMany({ _id: { $regex: `^drawn:${_id}:` } });
  await db.sentNotifications.insertMany(Object.entries(layout).map(([santa, giftee]) => ({ _id: `drawn:${_id}:${santa}:${giftee}`, kind: 'namesDrawn', sentAt: new Date() })));

  ok(await bob.trpc.mutate('membership.leave', { groupSlug: slug }));

  expect((await editionOf(db, slug)).draw!.history).toHaveLength(1);
  const { text } = await latestMail(dan.email, 'gifteeChanged');
  expect(text).toContain('Someone left “Leaving”, so the names were drawn again');
  expect(text).not.toContain('organizer');
  expect(ok(await dan.trpc.query('draw.mine', edition))).toMatchObject({ redrawn: false });
});
