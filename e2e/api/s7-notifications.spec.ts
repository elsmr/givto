// Notifications (was tests/smoke-s7.mjs, part 1; 14, 29, 30, 35, 55): cron auth, join request, draw
// notices, Psst!, questions, one-click unsubscribe, wishlist digests, organizer handover. Seeded in
// Mongo, jobs through the cron endpoint, mails from the mail mock. The jobs act on the whole
// database (and parallel tests run them too), so every check is on this test's own people and
// edition, never on the job's counts. Part 2 (reminders, webhook, retention): s7-reminders-retention.spec.ts.
import { randomBytes } from 'node:crypto';
import nlEmail from '@/messages/nl/email.json' with { type: 'json' };
import { expect, latestMail, ok, runCron, test, type SentMail } from '../fixtures';
import { drawOf, editionDoc, expectMails, groupDoc, mails, member, run, today } from './s7-seed';

test('cron: secret required, unknown jobs 404', async () => {
  expect((await runCron('deliveries', { authorization: null })).status).toBe(401);
  expect((await runCron('deliveries', { authorization: 'Bearer nope' })).status).toBe(401);
  expect((await runCron('nope')).status).toBe(404);
});

test('a family edition: join request, draw notices, Psst!, questions, unsubscribe, digests, handover', async ({ signIn, db }) => {
  const [olive, ann, bob, cee, dan] = await Promise.all(['olive', 'ann', 'bob', 'cee', 'dan'].map((name) => signIn(name)));
  // Family: Olive organizes and manages Kid; Dan asks to join through the link. Locale nl, so
  // people without an account get Dutch; account holders get their own language.
  const m = { olive: member(olive, 'Olive', { role: 'organizer' }), ann: member(ann, 'Ann'), bob: member(bob, 'Bob'), cee: member(cee, 'Cee') };
  const kid = member(null, 'Kid', { managedBy: m.olive.id });
  const linkToken = randomBytes(18).toString('base64url');
  const family = groupDoc(olive, 'Family', [...Object.values(m), kid], {
    locale: 'nl',
    joinLink: { token: linkToken, revoked: false, requiresApproval: true, createdAt: new Date() },
  });
  const e1 = editionDoc(family, 1, 'drawn', [...Object.values(m), kid], {
    giftDay: { date: today('Europe/Brussels', 10) },
    draw: drawOf([[m.olive, m.ann], [m.ann, m.bob], [m.bob, m.cee], [m.cee, kid], [kid, m.olive]]),
  });
  await db.groups.insertOne(family);
  await db.editions.insertOne(e1);
  const E1 = { groupSlug: family.slug, editionNumber: 1 };
  await db.users.updateOne({ email: dan.email }, { $set: { locale: 'nl' } });
  const drawNotices = () => db.sentNotifications.countDocuments({ _id: { $regex: `^drawn:${e1._id}:` } });
  let danId = '';

  await test.step('join request emails the organizer', async () => {
    expect(ok(await dan.trpc.mutate('join.accept', { groupSlug: family.slug, token: linkToken, name: 'Dan' })).status).toBe('requested');
    const request = await latestMail(olive.email, 'joinRequest');
    expect(request.subject).toMatch(/^Dan wants to join Family$/);
    danId = (await db.groups.findOne({ _id: family._id }))!.members.find((member) => member.name === 'Dan')!.id;
  });

  await test.step('names drawn: one email per Santa, once, never naming the giftee; managed members via their manager', async () => {
    await run('deliveries');
    await expectMails(olive, 'namesDrawn', 2, 'Family');
    for (const user of [ann, bob, cee]) await expectMails(user, 'namesDrawn', 1, 'Family');
    expect(await drawNotices(), 'five Santas, five notices').toBe(5);
    await run('deliveries');
    expect(await drawNotices(), 'second tick sends nothing').toBe(5);
    for (const [user, giftee] of [[ann, 'Bob'], [bob, 'Cee'], [cee, 'Kid']] as const) {
      const [mail, ...more] = await mails(user, 'namesDrawn');
      expect(more).toHaveLength(0);
      expect(mail.text.includes(giftee) || mail.html.includes(giftee) || mail.subject.includes(giftee), `${giftee} named`).toBe(false);
      expect(mail.text).toContain(`/g/${family.slug}`);
    }
    const oliveMails = await mails(olive, 'namesDrawn');
    expect(oliveMails, "her own and Kid's").toHaveLength(2);
    expect(oliveMails.some((mail) => mail.text.includes('For Kid'))).toBe(true);
  });

  await test.step('late joiner is approved and slots in (Ann → Dan → Bob): "you\'re in" in Dutch, only Ann hears "new giftee", Dan gets the draw email', async () => {
    // Approval after the draw slots Dan in at a random place (S4); pin the place so later steps can rely on it.
    ok(await olive.trpc.mutate('membership.approve', { groupSlug: family.slug, memberId: danId }));
    const joined = await mails(dan, 'joined');
    expect(joined).toHaveLength(1);
    expect(joined[0].subject, 'Dan reads Dutch').toBe(nlEmail.joined.subject.replace('{group}', 'Family'));
    const mDan = { id: danId };
    await db.editions.updateOne(
      { _id: e1._id },
      { $set: { draw: drawOf([[m.olive, m.ann], [m.ann, mDan], [mDan, m.bob], [m.bob, m.cee], [m.cee, kid], [kid, m.olive]]) } }
    );
    await run('deliveries');
    await expectMails(ann, 'gifteeChanged', 1);
    await expectMails(dan, 'namesDrawn', 1);
    expect(await drawNotices(), 'two more: Ann (new giftee) and Dan').toBe(7);
    expect((await mails(dan, 'namesDrawn'))[0].subject).toBe(nlEmail['names-drawn'].subject.replace('{group}', 'Family'));
    for (const user of [olive, bob, cee]) expect(await mails(user, 'gifteeChanged')).toHaveLength(0);
  });

  const expectAnonymous = (mail: SentMail) => {
    const all = JSON.stringify(mail);
    for (const secret of [bob.email, bob.id, 'Bob', m.bob.id]) expect(all, `leaks ${secret}`).not.toContain(secret);
  };

  let psst!: SentMail;
  await test.step('Psst!: emailed at its delivery slot, once, with nothing about the Santa', async () => {
    ok(await bob.trpc.mutate('nudge.send', { ...E1, kind: 'emptyWishlist' }));
    await run('deliveries');
    expect(await mails(cee, 'psst'), 'not before the slot').toHaveLength(0);
    await db.nudges.updateMany({ editionId: e1._id }, { $set: { sendAfter: new Date(Date.now() - 1000) } });
    await run('deliveries');
    await expectMails(cee, 'psst', 1);
    await run('deliveries');
    [psst] = await mails(cee, 'psst');
    expect(await mails(cee, 'psst')).toHaveLength(1);
    expectAnonymous(psst);
    expect(psst.from, 'same sender as every email').toBe((await mails(cee, 'namesDrawn'))[0].from);
    expect(psst.headers['List-Unsubscribe']).toMatch(/^<http:\/\/localhost:\d+\/api\/unsubscribe\?t=[0-9a-f]{24}\.santaMessages\.[\w-]+>$/);
    expect(psst.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    expect(psst.headers['List-Unsubscribe'], "the token is the recipient's").toContain(cee.id);
  });

  const questionsDue = () => db.questions.updateMany({ editionId: e1._id }, { $set: { notifyAfter: new Date(Date.now() - 1000) } });
  await test.step('question to the giftee, answer to the Santa: once each, the question without the asker', async () => {
    const { id: questionId } = ok(await bob.trpc.mutate('question.ask', { ...E1, text: 'What size are your feet?' }));
    await questionsDue();
    await run('deliveries');
    await expectMails(cee, 'question', 1);
    const [question] = await mails(cee, 'question');
    expect(question.text).toContain('What size are your feet?');
    expectAnonymous(question);
    ok(await cee.trpc.mutate('question.answer', { ...E1, questionId, text: 'Size 39' }));
    await run('deliveries');
    await expectMails(bob, 'answer', 1);
    await run('deliveries');
    const answers = await mails(bob, 'answer');
    expect(answers).toHaveLength(1);
    expect(answers[0].text).toContain('Size 39');
    expect(answers[0].text).not.toContain('Cee');
  });

  await test.step('one-click unsubscribe: POST only, signed; the opt-out is respected', async () => {
    const oneClick = psst.headers['List-Unsubscribe'].slice(1, -1);
    expect((await fetch(oneClick)).status, 'GET changes nothing').toBe(405);
    expect((await fetch(oneClick.replace(/.$/, (c) => (c === 'a' ? 'b' : 'a')), { method: 'POST' })).status, 'tampered').toBe(400);
    expect((await fetch(oneClick.replace(cee.id, bob.id), { method: 'POST' })).status, 'someone else').toBe(400);
    const res = await fetch(oneClick, {
      method: 'POST',
      body: 'List-Unsubscribe=One-Click',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    });
    expect(res.status).toBe(200);
    expect(ok(await cee.trpc.query('me.get')).notifications.santaMessages).toBe(false);
    expect(psst.html, 'footer link to the page').toContain(`/unsubscribe?t=${oneClick.split('t=')[1]}`);
    ok(await bob.trpc.mutate('question.ask', { ...E1, text: 'Favourite colour?' }));
    await questionsDue();
    await run('deliveries');
    await expect
      .poll(() => db.questions.countDocuments({ editionId: e1._id, notifiedAt: { $exists: false } }), { message: 'in-app delivery still marked' })
      .toBe(0);
    expect(await mails(cee, 'question'), 'opted out: no email').toHaveLength(1);
  });

  const pending = () => db.wishlistNotifications.findOne({ editionId: e1._id, gifteeMemberId: m.ann.id });
  const setPending = (set: object) => db.wishlistNotifications.updateOne({ editionId: e1._id, gifteeMemberId: m.ann.id }, { $set: set });
  const digestNow = () => setPending({ notifyAfter: new Date(Date.now() - 1000) });
  /** The batch was taken (by our run or a parallel one): nothing waits any more. */
  const expectBatchTaken = () => expect.poll(async () => (await pending())?.notifyAfter, { message: 'digest batch taken' }).toBeUndefined();

  await test.step('wishlist digest: 3 quick adds → one email after the quiet period, listing them', async () => {
    for (const title of ['Moomin mug', 'Green socks', 'A good novel']) ok(await ann.trpc.mutate('wish.create', { title }));
    await run('digests');
    expect(await mails(olive, 'wishlistUpdated'), 'quiet period').toHaveLength(0);
    expect((await pending())!.notifyAfter!.getTime(), 'still waiting').toBeGreaterThan(Date.now());
    await digestNow();
    await run('digests');
    await expectMails(olive, 'wishlistUpdated', 1);
    await run('digests');
    const [digest, ...more] = await mails(olive, 'wishlistUpdated');
    expect(more).toHaveLength(0);
    for (const title of ['Moomin mug', 'Green socks', 'A good novel']) expect(digest.text, title).toContain(title);
    expect(digest.headers['List-Unsubscribe']).toMatch(/wishlistUpdates/);
  });

  await test.step('wishlist digest: add + delete, reorder, a hidden wish, or a Santa who already looked → nothing', async () => {
    const wish = ok(await ann.trpc.mutate('wish.create', { title: 'Gone again' }));
    ok(await ann.trpc.mutate('wish.delete', { wishId: wish.id }));
    await digestNow();
    await run('digests');
    await expectBatchTaken();
    expect(await mails(olive, 'wishlistUpdated'), 'no changes').toHaveLength(1);
    const [first] = ok(await ann.trpc.query('wish.list'));
    ok(await ann.trpc.mutate('wish.move', { wishId: first.id, toIndex: 2 }));
    const hidden = ok(await ann.trpc.mutate('wish.create', { title: 'Secret wish' }));
    ok(await ann.trpc.mutate('wish.setHidden', { groupSlug: family.slug, wishId: hidden.id, hidden: true }));
    await digestNow();
    await run('digests');
    await expectBatchTaken();
    expect(await mails(olive, 'wishlistUpdated'), 'hidden in this group').toHaveLength(1);
    ok(await ann.trpc.mutate('wish.create', { title: 'Seen it' }));
    ok(await olive.trpc.query('claim.gifteeWishlist', E1));
    await digestNow();
    await run('digests');
    await expectBatchTaken();
    expect(await mails(olive, 'wishlistUpdated'), 'seen').toHaveLength(1);
  });

  await test.step('wishlist digest: constant editing still sends at the cap', async () => {
    const wish = ok(await ann.trpc.mutate('wish.create', { title: 'Edited a lot' }));
    await setPending({ firstChangeAt: new Date(Date.now() - 25 * 3600 * 1000) });
    ok(await ann.trpc.mutate('wish.update', { wishId: wish.id, title: 'Edited a lot, again' }));
    await run('digests');
    await expectMails(olive, 'wishlistUpdated', 2); // no waiting for quiet
    expect((await mails(olive, 'wishlistUpdated'))[1].text).toContain('Edited a lot, again');
  });

  await test.step('organizer handover: the new organizer hears it once', async () => {
    await db.groups.updateOne({ _id: family._id }, { $set: { organizerHandover: { toMemberId: m.ann.id, at: new Date() } } });
    await run('deliveries');
    await expectMails(ann, 'organizerHandover', 1);
    await run('deliveries');
    expect(await mails(ann, 'organizerHandover')).toHaveLength(1);
  });
});
