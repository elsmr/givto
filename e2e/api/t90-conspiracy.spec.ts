// Conspiracy Santa (90): no draw; a board per person, read and written by everyone in but that person. Nothing about
// a board reaches its subject, the organizer only sees boards as a participant, and tips never show board posts.
import enEmail from '@/messages/en/email.json' with { type: 'json' };
import { newId } from '@/lib/server/db';
import { expect, mailsTo, ok, test, type User } from '../fixtures';
import { code } from './s6-helpers';
import { newMember, seedEdition, seedGroup } from './seed-groups';

test('conspiracy: everyone but X reads and writes X’s board; X never sees a thing', async ({ signIn, db }) => {
  const [olive, ann, bob, cee, dan, nina, eve] = await Promise.all(['olive', 'ann', 'bob', 'cee', 'dan', 'nina', 'eve'].map((name) => signIn(name)));
  const m = {
    olive: newMember(olive, 'Olive', { role: 'organizer' }),
    ann: newMember(ann, 'Ann'),
    bob: newMember(bob, 'Bob'),
    cee: newMember(cee, 'Cee'),
    dan: newMember(dan, 'Dan'),
    nina: newMember(nina, 'Nina'),
  };
  const kid = newMember(null, 'Kid', { managedBy: m.olive.id });
  const group = await seedGroup(db, 'consp', olive, [...Object.values(m), kid]);
  const edition = await seedEdition(db, group, 1, 'open', { inDraw: [m.olive, m.ann, m.bob, m.cee, m.dan, kid] });
  await db.editions.updateOne({ _id: edition._id }, { $set: { kind: 'conspiracy', giftDay: { date: '2099-12-24' } } });
  const E = { groupSlug: group.slug, editionNumber: 1 };
  const names = async (user: User) => ok(await user.trpc.query('board.list', E))?.boards.map((b) => b.name).toSorted();
  const board = async (user: User, name: string) => ok(await user.trpc.query('board.list', E))!.boards.find((b) => b.name === name)!;
  const post = (user: User, about: { id: string }, text: string, anonymous?: boolean) =>
    user.trpc.mutate('board.create', { ...E, aboutMemberId: about.id, text, ...(anonymous !== undefined && { anonymous }) });

  const wish = ok(await ann.trpc.mutate('wish.create', { title: 'Polaroid camera' }));
  await db.groups.updateOne({ _id: group._id, 'members.id': m.ann.id }, { $set: { 'members.$.wishlistView.shownWishIds': [wish.id] } });
  const bobTip = newId();
  await db.tips.insertOne({ _id: bobTip, editionId: edition._id, aboutMemberId: m.ann.id, authorMemberId: m.bob.id, text: 'An old tip', anonymous: true, createdAt: new Date(), updatedAt: new Date() });

  const { bobPost, ceePost } = await test.step('boards: everyone in but me; the organizer as a participant, the kid’s too', async () => {
    expect(await names(bob)).toEqual(['Ann', 'Cee', 'Dan', 'Kid', 'Olive']);
    expect(await names(olive)).toEqual(['Ann', 'Bob', 'Cee', 'Dan', 'Kid']);
    expect(await names(nina), 'sitting out').toBeUndefined();
    expect(code(await eve.trpc.query('board.list', E))).toBe('GROUP_NOT_FOUND');

    const bobPost = ok(await post(bob, m.ann, 'Shall we get her the Polaroid?'));
    expect(bobPost).toMatchObject({ anonymous: false, mine: true, author: { name: 'Bob' } });
    const ceePost = ok(await post(cee, m.ann, 'I’m in, and film too', true));
    ok(await post(olive, kid, 'Dinosaur lego'));
    expect(code(await post(ann, m.ann, 'Me!')), 'not your own board').toBe('NOT_FOUND');
    expect(code(await post(nina, m.ann, 'x')), 'not in it').toBe('NOT_FOUND');
    expect(code(await post(bob, m.nina, 'x')), 'nobody’s board').toBe('NOT_FOUND');
    expect(code(await bob.trpc.mutate('tip.create', { ...E, aboutMemberId: m.ann.id, text: 'x' }))).toBe('EDITION_CLOSED');
    return { bobPost, ceePost };
  });

  await test.step('the others read it, named or anonymous, with Ann’s wishlist; tips stay off the board', async () => {
    const forDan = await board(dan, 'Ann');
    expect(forDan.posts.map((p) => [p.text, p.author?.name ?? null, p.mine])).toEqual([
      ['Shall we get her the Polaroid?', 'Bob', false],
      ['I’m in, and film too', null, false],
    ]);
    expect(forDan.wishes.map((w) => w.title)).toEqual(['Polaroid camera']);
    expect((await board(cee, 'Ann')).posts.map((p) => p.mine)).toEqual([false, true]);
    expect((await board(olive, 'Kid')).posts.map((p) => p.text)).toEqual(['Dinosaur lego']);
  });

  await test.step('only the author edits or deletes a post; tip procedures never reach one', async () => {
    ok(await cee.trpc.mutate('board.update', { ...E, postId: ceePost.id, text: 'I’m in, and film too!' }));
    expect((await board(dan, 'Ann')).posts[1]).toMatchObject({ text: 'I’m in, and film too!', author: null });
    expect(code(await bob.trpc.mutate('board.update', { ...E, postId: ceePost.id, text: 'mine now' }))).toBe('NOT_FOUND');
    expect(code(await bob.trpc.mutate('board.delete', { ...E, postId: ceePost.id }))).toBe('NOT_FOUND');
    expect(code(await bob.trpc.mutate('tip.delete', { ...E, tipId: bobPost.id }))).toBe('NOT_FOUND');
    expect(code(await bob.trpc.mutate('board.update', { ...E, postId: bobTip, text: 'x' }))).toBe('NOT_FOUND');
  });

  await test.step('switched to Secret Santa, neither boards nor tips show the posts', async () => {
    const settings = { ...E, title: 'Family', giftDay: { date: '2099-12-24' }, exchangeMode: 'byPost' as const };
    ok(await olive.trpc.mutate('settings.updateEdition', { ...settings, kind: 'secretSanta' }));
    expect(ok(await bob.trpc.query('board.list', E))).toBeNull();
    expect(ok(await bob.trpc.query('tip.authored', E)).tips.map((t) => t.text)).toEqual(['An old tip']);
    expect(code(await bob.trpc.mutate('tip.update', { ...E, tipId: bobPost.id, text: 'x' }))).toBe('NOT_FOUND');
    ok(await olive.trpc.mutate('settings.updateEdition', { ...settings, kind: 'conspiracy' }));
    expect((await db.editions.findOne({ _id: edition._id }))!.exchangeMode, 'in person only').toBe('inPerson');
    expect((await board(dan, 'Ann')).posts).toHaveLength(2);
  });

  await test.step('Ann gets no post, count or hint through any procedure', async () => {
    expect(await names(ann)).toEqual(['Bob', 'Cee', 'Dan', 'Kid', 'Olive']);
    const responses = [
      ok(await ann.trpc.query('board.list', E)),
      ok(await ann.trpc.query('group.get', { groupSlug: group.slug })),
      ok(await ann.trpc.query('tip.authored', E)),
      ok(await ann.trpc.query('tip.forGiftee', E)),
      ok(await ann.trpc.query('claim.gifteeWishlist', E)),
      ok(await ann.trpc.query('account.groups')),
      ok(await ann.trpc.query('account.export')),
    ].map((response) => JSON.stringify(response));
    for (const needle of ['Polaroid?', 'film too', bobPost.id, ceePost.id]) {
      expect(responses.filter((json) => json.includes(needle)), needle).toEqual([]);
    }
  });

  await test.step('lock in, then gift day: everyone in unwraps, "from all of us"', async () => {
    expect(code(await olive.trpc.mutate('draw.run', E))).toBe('FORBIDDEN');
    ok(await olive.trpc.mutate('draw.lockIn', E));
    expect(code(await olive.trpc.mutate('giftday.setMode', { ...E, mode: 'oneByOne' }))).toBe('FORBIDDEN');
    ok(await post(dan, m.ann, 'Locked in, still planning'));
    ok(await olive.trpc.mutate('manage.startGiftDay', E));
    const view = ok(await olive.trpc.query('giftday.presenter', E));
    expect(view.kind).toBe('conspiracy');
    expect(view.unwrapOrder!.people.map((p) => p.name).toSorted()).toEqual(['Ann', 'Bob', 'Cee', 'Dan', 'Kid', 'Olive']);
    expect(view.guessing).toBeNull();
  });

  await test.step('export lists my posts; deleting an account takes posts by and about them', async () => {
    const exported = ok(await bob.trpc.query('account.export')).tipsWritten;
    expect(exported.map((tip) => [tip.text, 'board' in tip])).toEqual([
      ['An old tip', false],
      ['Shall we get her the Polaroid?', true],
    ]);
    const before = (await mailsTo(ann.email)).filter((mail) => mail.tags.length === 0).length;
    ok(await ann.trpc.mutate('account.requestDeletion'));
    let mails = await mailsTo(ann.email);
    await expect.poll(async () => (mails = (await mailsTo(ann.email)).filter((mail) => mail.tags.length === 0)).length).toBe(before + 1);
    ok(await ann.trpc.mutate('account.delete', { code: mails.at(-1)!.text.match(/\b(\d{6})\b/)![1] }));
    expect(await db.tips.countDocuments({ editionId: edition._id, aboutMemberId: m.ann.id })).toBe(0);
    expect(await names(bob)).toEqual(['Cee', 'Dan', 'Kid', 'Olive']);
  });

  await test.step('once done, boards are read-only', async () => {
    ok(await olive.trpc.mutate('manage.finishGiftDay', E));
    const view = ok(await bob.trpc.query('board.list', E))!;
    expect(view.canWrite).toBe(false);
    expect(code(await post(bob, kid, 'Too late'))).toBe('EDITION_CLOSED');
  });
});

test('conspiracy: created in person, titled after the kind', async ({ signIn, db }) => {
  const ann = await signIn('ann');
  const group = ok(
    await ann.trpc.mutate('group.create', { name: 'Plot', organizerName: 'Ann', timeZone: 'Europe/Brussels', giftDay: { date: '2099-12-24' }, exchangeMode: 'byPost', kind: 'conspiracy' })
  );
  const stored = (await db.editions.findOne({ groupId: (await db.groups.findOne({ slug: group.slug }))!._id }))!;
  expect(stored).toMatchObject({ kind: 'conspiracy', exchangeMode: 'inPerson', title: 'Conspiracy Santa 2099' });
});

test('conspiracy: lock-in and wishlist reminders, never a gift one; to-dos to match', async ({ signIn, db }) => {
  const [ann, bob, cee] = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const group = ok(
    await ann.trpc.mutate('group.create', { name: 'Reminded', organizerName: 'Ann', timeZone: 'Europe/Brussels', giftDay: { date: '2099-12-24' }, exchangeMode: 'inPerson', kind: 'conspiracy' })
  );
  for (const [user, name] of [[bob, 'Bob'], [cee, 'Cee']] as const) {
    ok(await user.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name }));
  }
  ok(await ann.trpc.mutate('wish.create', { title: 'Socks', groupSlugs: [group.slug] }));
  const editionIds = [(await db.editions.findOne({ groupId: (await db.groups.findOne({ slug: group.slug }))!._id }))!._id];
  const runAt = async (now: string) => ok(await ann.trpc.mutate('reminders.runDue', { now, editionIds }));
  const todosOf = async (user: User) => ok(await user.trpc.query('account.groups')).find((g) => g.slug === group.slug)?.todos;

  expect(await todosOf(ann)).toEqual([{ kind: 'readyToLockIn' }]);
  expect(await todosOf(bob)).toEqual([{ kind: 'noWishes' }]);
  await runAt('2099-12-10T10:00:00.000Z');
  const [ready] = await mailsTo(ann.email, 'reminderReadyToDraw');
  expect(ready.subject).toContain(enEmail.reminder['lock-in'].subject);
  expect(await mailsTo(bob.email, 'reminderWishlist')).toHaveLength(1);

  ok(await ann.trpc.mutate('draw.lockIn', { groupSlug: group.slug, editionNumber: 1 }));
  await runAt('2099-12-17T10:00:00.000Z');
  for (const user of [ann, bob, cee]) expect(await mailsTo(user.email, 'reminderGift')).toEqual([]);
});
