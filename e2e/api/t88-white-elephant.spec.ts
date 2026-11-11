// White elephant (88): an edition kind with no draw. Locked in instead of drawn, every Secret Santa feature refused,
// gift day's unwrap order from everyone in.
import enEmail from '@/messages/en/email.json' with { type: 'json' };
import { expect, mailsTo, ok, test, type User } from '../fixtures';
import { code, editionOf, memberIdOf } from './s6-helpers';

const create = async (ann: User, name: string, kind?: 'whiteElephant') =>
  ok(
    await ann.trpc.mutate('group.create', {
      name,
      organizerName: 'Ann',
      timeZone: 'Europe/Brussels',
      giftDay: { date: '2099-12-24' },
      exchangeMode: 'byPost',
      ...(kind && { kind }),
    })
  );

const settings = { title: 'Swap', giftDay: { date: '2099-12-24' }, exchangeMode: 'byPost' as const };

test('white elephant: locks in without a draw, refuses Secret Santa features, unwraps everyone in', async ({ signIn, db }) => {
  const [ann, bob, cee, dan] = await Promise.all(['ann', 'bob', 'cee', 'dan'].map((name) => signIn(name)));
  const group = await create(ann, 'Swap', 'whiteElephant');
  const edition = { groupSlug: group.slug, editionNumber: 1 };
  const join = (user: User, name: string) => user.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name });

  await test.step('created in person, titled after the kind', async () => {
    const stored = await editionOf(db, group.slug);
    expect(stored).toMatchObject({ kind: 'whiteElephant', exchangeMode: 'inPerson', title: 'White elephant 2099' });
    expect(ok(await ann.trpc.query('group.get', { groupSlug: group.slug })).edition).toMatchObject({ kind: 'whiteElephant', guessing: false });
  });

  await test.step('lock in: organizer only, three people, never a draw', async () => {
    ok(await join(bob, 'Bob'));
    expect(code(await ann.trpc.mutate('draw.lockIn', edition))).toBe('TOO_FEW_PEOPLE');
    ok(await join(cee, 'Cee'));
    expect(code(await bob.trpc.mutate('draw.lockIn', edition))).toBe('NOT_ORGANIZER');
    expect(code(await ann.trpc.mutate('draw.run', edition))).toBe('FORBIDDEN');
    ok(await ann.trpc.mutate('draw.lockIn', edition));
    const locked = await editionOf(db, group.slug);
    expect(locked.status).toBe('drawn');
    expect(locked.draw).toBeUndefined();
    expect(locked.drawNoticesPendingAt).toBeUndefined();
    expect(code(await ann.trpc.mutate('draw.lockIn', edition))).toBe('ALREADY_DRAWN');
    expect(code(await ann.trpc.mutate('draw.redraw', edition))).toBe('NOT_DRAWN');
    expect(code(await ann.trpc.mutate('settings.updateEdition', { ...edition, ...settings, kind: 'secretSanta' }))).toBe('ALREADY_DRAWN');
  });

  await test.step('Secret Santa features are refused', async () => {
    const annId = await memberIdOf(db, group.slug, ann);
    expect(ok(await bob.trpc.query('draw.mine', edition)).giftee).toBeNull();
    expect(code(await bob.trpc.mutate('tip.create', { ...edition, aboutMemberId: annId, text: 'Mugs' }))).toBe('EDITION_CLOSED');
    expect(code(await bob.trpc.mutate('guess.make', { ...edition, memberId: annId }))).toBe('GUESSING_CLOSED');
    expect(code(await bob.trpc.mutate('question.ask', { ...edition, text: 'Size?' }))).toBe('NOT_DRAWN');
    expect(code(await bob.trpc.mutate('nudge.send', { ...edition, kind: 'emptyWishlist' }))).toBe('NOT_DRAWN');
    expect(code(await bob.trpc.mutate('gift.set', { ...edition, wishIds: [], lines: ['Socks'] }))).toBe('NOT_DRAWN');
    expect(code(await ann.trpc.mutate('giftday.setMode', { ...edition, mode: 'oneByOne' }))).toBe('FORBIDDEN');
    ok(await ann.trpc.mutate('giftday.setMode', { ...edition, mode: 'allAtOnce' }));
    expect(code(await ann.trpc.mutate('giftday.setReveal', { ...edition, enabled: true }))).toBe('FORBIDDEN');
  });

  await test.step('a late joiner is in; gift day unwraps everyone in, once each', async () => {
    ok(await join(dan, 'Dan'));
    ok(await ann.trpc.mutate('giftday.shuffle', edition));
    ok(await ann.trpc.mutate('manage.startGiftDay', edition));
    const ids = await Promise.all([ann, bob, cee, dan].map((user) => memberIdOf(db, group.slug, user)));
    let view = ok(await ann.trpc.query('giftday.presenter', edition));
    expect(view.unwrapOrder!.people.map((p) => p.memberId).toSorted()).toEqual(ids.toSorted());
    expect(view.guessing).toBeNull();
    const advance = async (action: 'start' | 'spin' | 'last') =>
      (view = ok(await ann.trpc.mutate('giftday.advance', { ...edition, action, turnsTaken: view.unwrapOrder!.turnsTaken })));
    await advance('start');
    const went: string[] = [];
    while (!view.unwrapOrder!.finished) {
      if (!view.unwrapOrder!.currentShown) await advance('spin');
      went.push(view.unwrapOrder!.current!.memberId);
      await advance('last');
    }
    expect(went.toSorted()).toEqual(ids.toSorted());
  });
});

test('white elephant: gift day by date shuffles everyone in', async ({ signIn, db }) => {
  const [ann, bob, cee] = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const group = await create(ann, 'By date', 'whiteElephant');
  for (const [user, name] of [[bob, 'Bob'], [cee, 'Cee']] as const) {
    ok(await user.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name }));
  }
  ok(await ann.trpc.mutate('draw.lockIn', { groupSlug: group.slug, editionNumber: 1 }));
  const { _id } = await editionOf(db, group.slug);
  expect(ok(await ann.trpc.mutate('giftday.runDue', { now: '2099-12-24T12:00:00Z', editionIds: [_id] })).giftday).toContain(_id);
  const stored = await editionOf(db, group.slug);
  const ids = await Promise.all([ann, bob, cee].map((user) => memberIdOf(db, group.slug, user)));
  expect(stored.status).toBe('giftday');
  expect(stored.unwrapOrder!.memberIds.toSorted()).toEqual(ids.toSorted());
});

test('white elephant: the kind changes before lock-in only, and the next edition copies it', async ({ signIn, db }) => {
  const [ann] = await Promise.all(['ann'].map((name) => signIn(name)));
  const group = await create(ann, 'Switch');
  const edition = { groupSlug: group.slug, editionNumber: 1 };
  ok(await ann.trpc.mutate('giftday.setReveal', { ...edition, enabled: true }));
  ok(await ann.trpc.mutate('giftday.setMode', { ...edition, mode: 'oneByOne' }));
  ok(
    await ann.trpc.mutate('settings.updateEdition', {
      ...edition,
      ...settings,
      kind: 'whiteElephant',
      drawOn: '2099-12-01',
      wishlistBy: '2099-12-10',
      postBy: '2099-12-15',
    })
  );
  const switched = await editionOf(db, group.slug);
  expect(switched).toMatchObject({ kind: 'whiteElephant', exchangeMode: 'inPerson', reveal: { enabled: false } });
  for (const field of ['drawAt', 'wishlistBy', 'postBy', 'unwrapMode'] as const) expect(switched[field]).toBeUndefined();

  ok(await ann.trpc.mutate('settings.updateEdition', { ...edition, ...settings, kind: 'secretSanta' }));
  expect(await editionOf(db, group.slug)).toMatchObject({ kind: 'secretSanta', exchangeMode: 'byPost' });
  ok(await ann.trpc.mutate('settings.updateEdition', { ...edition, ...settings, kind: 'whiteElephant' }));

  await db.editions.updateOne({ _id: switched._id }, { $set: { status: 'done' } });
  ok(await ann.trpc.mutate('edition.startNext', { groupSlug: group.slug }));
  const next = (await db.editions.findOne({ groupId: switched.groupId, number: 2 }))!;
  expect(next).toMatchObject({ kind: 'whiteElephant', title: `White elephant ${next.year}` });
});

test('white elephant: lock-in and bring-a-gift reminders, no wishlist ones; to-dos to match', async ({ signIn, db }) => {
  const [ann, bob, cee] = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const group = await create(ann, 'Reminded', 'whiteElephant');
  for (const [user, name] of [[bob, 'Bob'], [cee, 'Cee']] as const) {
    ok(await user.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name }));
  }
  const editionIds = [(await editionOf(db, group.slug))._id];
  const runAt = async (now: string) => ok(await ann.trpc.mutate('reminders.runDue', { now, editionIds }));
  const todosOf = async (user: User) => ok(await user.trpc.query('account.groups')).find((g) => g.slug === group.slug)?.todos;

  expect(await todosOf(ann)).toEqual([{ kind: 'readyToLockIn' }]);
  expect(await todosOf(bob)).toEqual([]);
  await runAt('2099-12-10T10:00:00.000Z');
  const [ready] = await mailsTo(ann.email, 'reminderReadyToDraw');
  expect(ready.subject).toBe(`${enEmail.reminder['lock-in'].subject} · Reminded`);
  expect((await mailsTo(bob.email)).filter((mail) => mail.tags.some((tag) => tag.startsWith('reminder')))).toEqual([]);

  ok(await ann.trpc.mutate('draw.lockIn', { groupSlug: group.slug, editionNumber: 1 }));
  expect(await todosOf(ann)).toEqual([]);
  await runAt('2099-12-17T10:00:00.000Z');
  for (const user of [ann, bob, cee]) {
    const mails = await mailsTo(user.email, 'reminderGift');
    expect(mails.map((mail) => mail.subject)).toEqual([`${enEmail.reminder.bring.subject} · Reminded`]);
    expect(mails[0].text).not.toContain('#giftee');
  }
  expect(await mailsTo(bob.email, 'reminderWishlist')).toEqual([]);
});
