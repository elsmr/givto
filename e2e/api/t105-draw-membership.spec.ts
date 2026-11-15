// 105: the draw survives people joining, leaving, being removed and deleting their account.
// Gift day freezes the draw, late joiners never take a giftee from a Santa who started,
// one member per account, removal re-draws when it must, same names refused.
import { newId } from '@/lib/server/db';
import { expect, latestMail, mailsTo, ok, runJob, test, uniqueEmail, type TestDb, type User } from '../fixtures';
import { inviteTokenFrom, signInEmail } from './s1-group';
import { code, drawnGroup, editionOf, memberIdOf } from './s6-helpers';
import { expectValidDraw } from './s4-group';

const TZ = 'Europe/Brussels';
const DAY = 24 * 60 * 60 * 1000;

const membersOf = async (db: TestDb, slug: string) => (await db.groups.findOne({ slug }))!.members;

const changedMails = async (users: User[]) => Promise.all(users.map(async (user) => (await mailsTo(user.email, 'gifteeChanged')).length));

test('gift day: leaving or being removed changes nobody’s giftee; the leaver drops out of the unwrap order, the pairs stay', async ({ signIn, db }) => {
  const [ann, bob, cee, dan] = await Promise.all(['ann', 'bob', 'cee', 'dan'].map((name) => signIn(name)));
  const { slug } = await drawnGroup([ann, bob, cee, dan], 'Frozen');
  const edition = { groupSlug: slug, editionNumber: 1 };
  const id = { ann: await memberIdOf(db, slug, ann), bob: await memberIdOf(db, slug, bob), cee: await memberIdOf(db, slug, cee), dan: await memberIdOf(db, slug, dan) };
  ok(await bob.trpc.mutate('gift.set', { ...edition, wishIds: [], lines: ['A scarf'] }));
  ok(await ann.trpc.mutate('manage.startGiftDay', edition));
  const before = (await editionOf(db, slug)).draw!.assignments;
  const mailsBefore = await changedMails([ann, bob]);

  ok(await cee.trpc.mutate('membership.leave', { groupSlug: slug }));
  ok(await ann.trpc.mutate('settings.removePerson', { groupSlug: slug, memberId: id.dan }));

  const after = await editionOf(db, slug);
  expect(after.draw!.assignments).toEqual(before);
  expect(after.participants.filter((p) => p.gifteeChangedAt)).toHaveLength(0);
  expect(await changedMails([ann, bob])).toEqual(mailsBefore);
  expect(await db.gifts.countDocuments({ editionId: after._id, santaMemberId: id.bob }), 'Bob’s mark stays').toBe(1);
  const people = ok(await ann.trpc.query('giftday.presenter', edition)).unwrapOrder!.people.map((p) => p.memberId);
  expect(people.toSorted()).toEqual([id.ann, id.bob].toSorted());

  ok(await ann.trpc.mutate('giftday.setReveal', { ...edition, enabled: true }));
  ok(await ann.trpc.mutate('giftday.reveal', edition));
  const names: Record<string, string> = { [id.ann]: 'Ann', [id.bob]: 'Bob', [id.cee]: 'Cee', [id.dan]: 'Dan' };
  const left = new Set([id.cee, id.dan]);
  const expected = Object.entries(before).map(([santa, giftee]) => ({
    giftee: names[giftee],
    santa: names[santa],
    ...(left.has(giftee) && { gifteeLeft: true }),
    ...(left.has(santa) && { santaLeft: true }),
  }));
  const pairs = ok(await ann.trpc.query('giftday.presenter', edition)).reveal.pairs!;
  expect(pairs.toSorted((a, b) => a.giftee.localeCompare(b.giftee))).toEqual(expected.toSorted((a, b) => a.giftee.localeCompare(b.giftee)));
});

test('late joiner: only slotted in after a Santa who hasn’t started; with none left they stay out and the organizer sees it', async ({ signIn, db }) => {
  const [ann, bob, cee, dan, eve, fay] = await Promise.all(['ann', 'bob', 'cee', 'dan', 'eve', 'fay'].map((name) => signIn(name)));
  const group = await drawnGroup([ann, bob, cee, dan], 'Started');
  const { slug } = group;
  const edition = { groupSlug: slug, editionNumber: 1 };
  const id = { ann: await memberIdOf(db, slug, ann), bob: await memberIdOf(db, slug, bob), cee: await memberIdOf(db, slug, cee), dan: await memberIdOf(db, slug, dan) };
  const { _id: editionId } = await editionOf(db, slug);
  await db.claims.insertOne({ _id: newId(), wishId: newId(), ownerId: newId(), editionId, santaMemberId: id.ann, createdAt: new Date() });
  ok(await bob.trpc.mutate('gift.set', { ...edition, wishIds: [], lines: ['Socks'] }));
  ok(await cee.trpc.mutate('gift.set', { ...edition, wishIds: [], lines: ['A book'] }));

  const before = (await editionOf(db, slug)).draw!.assignments;
  ok(await eve.trpc.mutate('join.accept', { groupSlug: slug, token: group.joinToken, name: 'Eve' }));
  const eveId = await memberIdOf(db, slug, eve);
  const withEve = (await editionOf(db, slug)).draw!.assignments;
  expect(withEve).toEqual({ ...before, [id.dan]: eveId, [eveId]: before[id.dan] });

  ok(await dan.trpc.mutate('gift.set', { ...edition, wishIds: [], lines: ['A mug'] }));
  ok(await eve.trpc.mutate('gift.set', { ...edition, wishIds: [], lines: ['Tea'] }));
  ok(await fay.trpc.mutate('join.accept', { groupSlug: slug, token: group.joinToken, name: 'Fay' }));
  expect((await editionOf(db, slug)).draw!.assignments).toEqual(withEve);
  expect(ok(await fay.trpc.query('draw.mine', edition))).toMatchObject({ inEdition: true, giftee: null });
  expect(ok(await ann.trpc.query('group.get', { groupSlug: slug })).organizer?.notInDraw).toEqual(['Fay']);
  expect(ok(await ann.trpc.query('settings.removalEffect', { groupSlug: slug, memberId: await memberIdOf(db, slug, fay) }))).toBe('none');
  expect(ok(await bob.trpc.query('group.get', { groupSlug: slug })).organizer).toBeUndefined();
});

test('removed members need a new invite; leaving after the draw and coming back sits this edition out', async ({ signIn, db }) => {
  const [ann, bob, cee, dan, eve] = await Promise.all(['ann', 'bob', 'cee', 'dan', 'eve'].map((name) => signIn(name)));
  const group = await drawnGroup([ann, bob, cee, dan], 'Comebacks');
  const { slug, joinToken: token } = group;
  const edition = { groupSlug: slug, editionNumber: 1 };
  const danId = await memberIdOf(db, slug, dan);

  await test.step('removed: the join link is refused, a new invite brings them back like a late joiner', async () => {
    ok(await ann.trpc.mutate('settings.removePerson', { groupSlug: slug, memberId: danId }));
    expect(code(await dan.trpc.mutate('join.accept', { groupSlug: slug, token }))).toBe('JOIN_LINK_INVALID');
    expect(code(await dan.trpc.query('group.get', { groupSlug: slug }))).toBe('GROUP_NOT_FOUND');
    ok(await ann.trpc.mutate('invite.send', { groupSlug: slug, email: dan.email }));
    ok(await dan.trpc.mutate('invite.accept', { groupSlug: slug, token: await inviteTokenFrom(dan.email) }));
    expect((await membersOf(db, slug)).filter((m) => m.userId === dan.id).map((m) => [m.id, m.status])).toEqual([[danId, 'joined']]);
    expect(Object.keys((await editionOf(db, slug)).draw!.assignments)).toContain(danId);
  });

  await test.step('left after the draw: back through the link, out of this draw, nobody else changes', async () => {
    const ceeId = await memberIdOf(db, slug, cee);
    ok(await cee.trpc.mutate('membership.leave', { groupSlug: slug }));
    const before = (await editionOf(db, slug)).draw!.assignments;
    const mailsBefore = await changedMails([ann, bob, dan]);
    expect(ok(await cee.trpc.mutate('join.accept', { groupSlug: slug, token })).status).toBe('joined');
    expect((await editionOf(db, slug)).draw!.assignments).toEqual(before);
    expect(Object.keys(before)).not.toContain(ceeId);
    expect(ok(await cee.trpc.query('draw.mine', edition))).toMatchObject({ inEdition: false, giftee: null });
    expect(await changedMails([ann, bob, dan])).toEqual(mailsBefore);
  });

  await test.step('a declined join request can’t ask again through the link', async () => {
    ok(await ann.trpc.mutate('join.updateLink', { groupSlug: slug, requiresApproval: true, maxMembers: null }));
    expect(ok(await eve.trpc.mutate('join.accept', { groupSlug: slug, token, name: 'Eve' })).status).toBe('requested');
    ok(await ann.trpc.mutate('membership.reject', { groupSlug: slug, memberId: await memberIdOf(db, slug, eve) }));
    expect(code(await eve.trpc.mutate('join.accept', { groupSlug: slug, token }))).toBe('JOIN_LINK_INVALID');
  });
});

test('re-invited, then declined or expired: a leaver still sits this edition out, someone removed still can’t use the link', async ({ signIn, db }) => {
  const [ann, bob, cee, dan, eve] = await Promise.all(['ann', 'bob', 'cee', 'dan', 'eve'].map((name) => signIn(name)));
  const group = ok(await ann.trpc.mutate('group.create', { name: 'Declined again', organizerName: 'Ann', timeZone: TZ, exchangeMode: 'inPerson' }));
  const { slug, joinToken: token } = group;
  for (const [person, name] of [[bob, 'Bob'], [cee, 'Cee'], [dan, 'Dan'], [eve, 'Eve']] as const) ok(await person.trpc.mutate('join.accept', { groupSlug: slug, token, name }));
  const edition = { groupSlug: slug, editionNumber: 1 };
  ok(await ann.trpc.mutate('draw.run', edition));
  const danId = await memberIdOf(db, slug, dan);

  await test.step('left, re-invited, declined: back through the link, still out of this draw', async () => {
    ok(await cee.trpc.mutate('membership.leave', { groupSlug: slug }));
    ok(await ann.trpc.mutate('invite.send', { groupSlug: slug, email: cee.email }));
    ok(await cee.trpc.mutate('invite.decline', { groupSlug: slug, token: await inviteTokenFrom(cee.email) }));
    const before = (await editionOf(db, slug)).draw!.assignments;
    expect(ok(await cee.trpc.mutate('join.accept', { groupSlug: slug, token })).status).toBe('joined');
    expect((await editionOf(db, slug)).draw!.assignments).toEqual(before);
    expect(ok(await cee.trpc.query('draw.mine', edition))).toMatchObject({ inEdition: false, giftee: null });
  });

  await test.step('removed, re-invited, invite expired: the link is still refused', async () => {
    ok(await ann.trpc.mutate('settings.removePerson', { groupSlug: slug, memberId: danId }));
    ok(await ann.trpc.mutate('invite.send', { groupSlug: slug, email: dan.email }));
    const { _id: groupId } = (await db.groups.findOne({ slug }))!;
    await runJob('reminders', { now: new Date(Date.now() + 8 * DAY).toISOString(), groupIds: [groupId] });
    expect((await membersOf(db, slug)).find((m) => m.id === danId)?.status).toBe('declined');
    expect(code(await dan.trpc.mutate('join.accept', { groupSlug: slug, token }))).toBe('JOIN_LINK_INVALID');
  });
});

test('two people leaving at once: the re-draw for one never draws the other back in', async ({ signIn, db }) => {
  const users = Object.fromEntries(await Promise.all(['ann', 'bob', 'cee', 'dan', 'eve', 'fay'].map(async (name) => [name, await signIn(name)] as const)));
  for (let attempt = 0; attempt < 3; attempt++) {
    const group = ok(await users.ann.trpc.mutate('group.create', { name: 'Both gone', organizerName: 'Ann', timeZone: TZ, exchangeMode: 'inPerson' }));
    const { slug } = group;
    for (const [name, user] of Object.entries(users).slice(1)) ok(await user.trpc.mutate('join.accept', { groupSlug: slug, token: group.joinToken, name: name[0].toUpperCase() + name.slice(1) }));
    const id = Object.fromEntries(await Promise.all(Object.entries(users).map(async ([name, user]) => [name, await memberIdOf(db, slug, user)])));
    ok(await users.ann.trpc.mutate('group.setKeepApart', { groupSlug: slug, households: [[id.ann, id.cee], [id.ann, id.dan], [id.ann, id.fay]] }));
    ok(await users.ann.trpc.mutate('draw.run', { groupSlug: slug, editionNumber: 1 }));
    // Without Bob, Ann (who may only give to Bob or Eve) needs a re-draw; without Fay, Eve simply gives to Cee.
    const { _id } = await editionOf(db, slug);
    const layout = { [id.ann]: id.bob, [id.bob]: id.ann, [id.cee]: id.dan, [id.dan]: id.eve, [id.eve]: id.fay, [id.fay]: id.cee };
    await db.editions.updateOne({ _id }, { $set: { 'draw.assignments': layout } });

    await Promise.all([users.bob, users.fay].map(async (user) => ok(await user.trpc.mutate('membership.leave', { groupSlug: slug }))));
    const { assignments } = (await editionOf(db, slug)).draw!;
    expectValidDraw(assignments, [id.ann, id.cee, id.dan, id.eve]);
  }
});

test('invite accept for an account that already has a member here: refused, the invite stays usable', async ({ signIn, newClient, db, secrets }) => {
  const [ann, bob] = await Promise.all([signIn('ann'), signIn('bob')]);
  const group = ok(await ann.trpc.mutate('group.create', { name: 'Twice', organizerName: 'Ann', timeZone: TZ, exchangeMode: 'inPerson' }));
  ok(await bob.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name: 'Bob' }));
  const hal = uniqueEmail('hal');
  secrets.push(hal);
  const { memberId } = ok(await ann.trpc.mutate('invite.send', { groupSlug: group.slug, email: hal }));
  const inviteToken = await inviteTokenFrom(hal);
  const halClient = await signInEmail(await newClient(), hal, secrets);
  const halId = (await db.users.findOne({ email: hal }))!._id.toHexString();
  await db.groups.updateOne(
    { slug: group.slug },
    { $push: { members: { id: newId(), userId: halId, name: 'Hal', role: 'member', status: 'declined', wishlistView: { shownWishIds: [] } } } }
  );
  expect(code(await halClient.trpc.mutate('invite.accept', { groupSlug: group.slug, token: inviteToken, name: 'Hal' }))).toBe('ALREADY_MEMBER');
  expect(await db.invites.countDocuments({ memberId, usedAt: { $exists: false } })).toBe(1);
});

test('a deleted account is taken out of the draw like a removal', async ({ signIn, db, secrets }) => {
  const [ann, bob, cee, dan] = await Promise.all(['ann', 'bob', 'cee', 'dan'].map((name) => signIn(name)));
  const { slug } = await drawnGroup([ann, bob, cee, dan], 'Deleted');
  const danId = await memberIdOf(db, slug, dan);
  const rest = await Promise.all([ann, bob, cee].map((user) => memberIdOf(db, slug, user)));
  ok(await dan.trpc.mutate('account.requestDeletion'));
  const deletionCode = (await mailsTo(dan.email)).filter((mail) => mail.tags.length === 0).at(-1)!.text.match(/\b(\d{6})\b/)![1];
  secrets.push(deletionCode);
  ok(await dan.trpc.mutate('account.delete', { code: deletionCode }));
  const { draw } = await editionOf(db, slug);
  expectValidDraw(draw!.assignments, rest);
  expect(Object.values(draw!.assignments)).not.toContain(danId);
});

test('one member per account: re-inviting someone removed or who declined reuses their member', async ({ signIn, newClient, db, secrets }) => {
  const [ann, bob, cee] = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const group = ok(await ann.trpc.mutate('group.create', { name: 'One each', organizerName: 'Ann', timeZone: TZ, exchangeMode: 'inPerson' }));
  const { slug, joinToken: token } = group;
  for (const [person, name] of [[bob, 'Bob'], [cee, 'Cee']] as const) ok(await person.trpc.mutate('join.accept', { groupSlug: slug, token, name }));
  ok(await ann.trpc.mutate('draw.run', { groupSlug: slug, editionNumber: 1 }));
  const ceeId = await memberIdOf(db, slug, cee);

  await test.step('removed → invited → accepts → join link: still one member', async () => {
    ok(await ann.trpc.mutate('settings.removePerson', { groupSlug: slug, memberId: ceeId }));
    expect(ok(await ann.trpc.mutate('invite.send', { groupSlug: slug, email: cee.email })).memberId).toBe(ceeId);
    expect((await membersOf(db, slug)).find((m) => m.id === ceeId)?.status).toBe('invited');
    ok(await cee.trpc.mutate('invite.accept', { groupSlug: slug, token: await inviteTokenFrom(cee.email) }));
    ok(await cee.trpc.mutate('join.accept', { groupSlug: slug, token }));
    const mine = (await membersOf(db, slug)).filter((m) => m.userId === cee.id);
    expect(mine.map((m) => [m.id, m.status])).toEqual([[ceeId, 'joined']]);
    const { assignments } = (await editionOf(db, slug)).draw!;
    expect(Object.keys(assignments).filter((santa) => santa === ceeId)).toHaveLength(1);
  });

  await test.step('declined → invited again: the same member, back to invited', async () => {
    const gus = uniqueEmail('gus');
    secrets.push(gus);
    const { memberId } = ok(await ann.trpc.mutate('invite.send', { groupSlug: slug, email: gus }));
    ok(await (await newClient()).trpc.mutate('invite.decline', { groupSlug: slug, token: await inviteTokenFrom(gus) }));
    expect(ok(await ann.trpc.mutate('invite.send', { groupSlug: slug, email: gus })).memberId).toBe(memberId);
    const gusRows = (await membersOf(db, slug)).filter((m) => m.id === memberId || m.name.startsWith('e2e gus'));
    expect(gusRows.map((m) => [m.id, m.status])).toEqual([[memberId, 'invited']]);
    const inviteToken = await inviteTokenFrom(gus);
    const gusClient = await signInEmail(await newClient(), gus, secrets);
    ok(await gusClient.trpc.mutate('invite.accept', { groupSlug: slug, token: inviteToken, name: 'Gus' }));
    expect((await membersOf(db, slug)).find((m) => m.id === memberId)?.status).toBe('joined');
  });
});

test('removal that breaks the draw re-draws everyone (after a warning), or is refused when no draw is possible', async ({ signIn, db }) => {
  const [ann, bob, cee, dan, eve] = await Promise.all(['ann', 'bob', 'cee', 'dan', 'eve'].map((name) => signIn(name)));
  const users = { ann, bob, cee, dan, eve };

  await test.step('re-drawn: only people whose giftee changed hear it, in the re-draw’s own words', async () => {
    const group = ok(await ann.trpc.mutate('group.create', { name: 'Redraw', organizerName: 'Ann', timeZone: TZ, exchangeMode: 'inPerson' }));
    const { slug } = group;
    for (const [person, name] of [[bob, 'Bob'], [cee, 'Cee'], [dan, 'Dan'], [eve, 'Eve']] as const) ok(await person.trpc.mutate('join.accept', { groupSlug: slug, token: group.joinToken, name }));
    const id = Object.fromEntries(await Promise.all(Object.entries(users).map(async ([name, user]) => [name, await memberIdOf(db, slug, user)])));
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
    expect(ok(await ann.trpc.query('settings.removalEffect', { groupSlug: slug, memberId: id.bob }))).toBe('redraw');
    expect(ok(await ann.trpc.query('settings.removalEffect', { groupSlug: slug, memberId: id.eve }))).toBe('patch');
    const mailsBefore = await changedMails([ann, cee, dan, eve]);

    ok(await ann.trpc.mutate('settings.removePerson', { groupSlug: slug, memberId: id.bob }));
    const after = await editionOf(db, slug);
    expect(after.status).toBe('drawn');
    // The only draw left: Ann↔Eve, Cee↔Dan. Cee keeps Dan.
    expect(after.draw!.assignments).toEqual({ [id.ann]: id.eve, [id.eve]: id.ann, [id.cee]: id.dan, [id.dan]: id.cee });
    expect(after.draw!.history).toHaveLength(1);
    expect((await changedMails([ann, cee, dan, eve])).map((count, i) => count - mailsBefore[i])).toEqual([1, 0, 1, 1]);
    expect((await latestMail(dan.email, 'gifteeChanged')).text).toContain('drew the names again');
    expect(ok(await dan.trpc.query('draw.mine', edition))).toMatchObject({ redrawn: true });
    expect(ok(await cee.trpc.query('draw.mine', edition))).toMatchObject({ changedAt: null });
  });

  await test.step('no draw possible without them: refused, nothing changes', async () => {
    const group = ok(await ann.trpc.mutate('group.create', { name: 'Stuck', organizerName: 'Ann', timeZone: TZ, exchangeMode: 'inPerson' }));
    const { slug } = group;
    for (const [person, name] of [[bob, 'Bob'], [cee, 'Cee'], [dan, 'Dan']] as const) ok(await person.trpc.mutate('join.accept', { groupSlug: slug, token: group.joinToken, name }));
    const id = Object.fromEntries(await Promise.all(Object.entries({ ann, bob, cee, dan }).map(async ([name, user]) => [name, await memberIdOf(db, slug, user)])));
    ok(await ann.trpc.mutate('group.setKeepApart', { groupSlug: slug, households: [[id.ann, id.cee], [id.ann, id.dan]] }));
    ok(await ann.trpc.mutate('draw.run', { groupSlug: slug, editionNumber: 1 }));
    const before = await editionOf(db, slug);
    expect(code(await ann.trpc.mutate('settings.removePerson', { groupSlug: slug, memberId: id.bob }))).toBe('DRAW_IMPOSSIBLE');
    const after = await editionOf(db, slug);
    expect([after.status, after.draw!.assignments]).toEqual(['drawn', before.draw!.assignments]);
    expect((await membersOf(db, slug)).find((m) => m.id === id.bob)?.status).toBe('joined');
    expect(ok(await ann.trpc.query('group.get', { groupSlug: slug })).organizer?.leftInDraw).toEqual([]);
  });

  await test.step('leaving can’t be refused: they stay in the draw and the organizer sees it', async () => {
    const { slug } = (await db.groups.findOne({ name: 'Stuck', 'members.userId': bob.id }))!;
    const before = await editionOf(db, slug);
    ok(await bob.trpc.mutate('membership.leave', { groupSlug: slug }));
    const after = await editionOf(db, slug);
    expect([after.status, after.draw!.assignments]).toEqual(['drawn', before.draw!.assignments]);
    expect(ok(await ann.trpc.query('group.get', { groupSlug: slug })).organizer?.leftInDraw).toEqual(['Bob']);
  });
});

test('re-draw and slot-in changes are told apart', async ({ signIn, db }) => {
  const [ann, bob, cee, dan] = await Promise.all(['ann', 'bob', 'cee', 'dan'].map((name) => signIn(name)));
  const group = await drawnGroup([ann, bob, cee], 'Words');
  const edition = { groupSlug: group.slug, editionNumber: 1 };
  ok(await dan.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name: 'Dan' }));
  const danId = await memberIdOf(db, group.slug, dan);
  const santaId = Object.entries((await editionOf(db, group.slug)).draw!.assignments).find(([, giftee]) => giftee === danId)![0];
  const santaUser = (await Promise.all([ann, bob, cee].map(async (user) => [user, await memberIdOf(db, group.slug, user)] as const))).find(([, memberId]) => memberId === santaId)![0];
  expect((await latestMail(santaUser.email, 'gifteeChanged')).text).toContain('joined or left');
  expect(ok(await santaUser.trpc.query('draw.mine', edition))).toMatchObject({ redrawn: false });

  let redrawn: User | undefined;
  for (let i = 0; i < 10 && !redrawn; i++) {
    const before = await Promise.all([ann, bob, cee, dan].map(async (user) => (await mailsTo(user.email, 'gifteeChanged')).length));
    ok(await ann.trpc.mutate('draw.redraw', edition));
    const after = await Promise.all([ann, bob, cee, dan].map(async (user) => (await mailsTo(user.email, 'gifteeChanged')).length));
    redrawn = [ann, bob, cee, dan].find((_, index) => after[index] > before[index]);
  }
  expect((await latestMail(redrawn!.email, 'gifteeChanged')).text).toContain('drew the names again');
  expect(ok(await redrawn!.trpc.query('draw.mine', edition))).toMatchObject({ redrawn: true });
});

test('same names: refused at join and accept; a named account picks a name for this group; renaming never makes a twin', async ({ signIn, newClient, db, secrets }) => {
  const [ann, olga, olga2, bob] = await Promise.all(['ann', 'olga', 'olga2', 'bob'].map((name) => signIn(name)));
  const group = ok(await ann.trpc.mutate('group.create', { name: 'Twins', organizerName: 'Ann', timeZone: TZ, exchangeMode: 'inPerson' }));
  const { slug, joinToken: token } = group;
  ok(await olga.trpc.mutate('join.accept', { groupSlug: slug, token, name: 'Olga' }));

  await test.step('typed name: refused when taken, case and spaces aside', async () => {
    expect(code(await olga2.trpc.mutate('join.accept', { groupSlug: slug, token, name: 'OL GA' }))).toBe('NAME_TAKEN');
    expect(ok(await olga2.trpc.mutate('join.accept', { groupSlug: slug, token, name: 'Olga P' })).status).toBe('joined');
  });

  const elsewhere = ok(await bob.trpc.mutate('group.create', { name: 'Elsewhere', organizerName: 'Olga', timeZone: TZ, exchangeMode: 'inPerson' }));

  await test.step('named account: refused without a name, in with a group name; the account keeps its own', async () => {
    expect(ok(await bob.trpc.query('account.get')).name).toBe('Olga');
    expect(code(await bob.trpc.mutate('join.accept', { groupSlug: slug, token }))).toBe('NAME_TAKEN');
    expect(ok(await bob.trpc.mutate('join.accept', { groupSlug: slug, token, name: 'Olga B' })).status).toBe('joined');
    expect((await membersOf(db, slug)).find((m) => m.userId === bob.id)?.name).toBe('Olga B');
    expect(ok(await bob.trpc.query('account.get')).name).toBe('Olga');
  });

  await test.step('renaming the account: a group-specific name stays, a rename that would collide is skipped there', async () => {
    ok(await bob.trpc.mutate('account.setName', { name: 'Robert' }));
    expect((await membersOf(db, slug)).find((m) => m.userId === bob.id)?.name).toBe('Olga B');
    expect((await membersOf(db, elsewhere.slug)).find((m) => m.userId === bob.id)?.name).toBe('Robert');
    ok(await ann.trpc.mutate('account.setName', { name: 'olga' }));
    expect((await membersOf(db, slug)).find((m) => m.userId === ann.id)?.name).toBe('Ann');
    expect(ok(await olga2.trpc.query('account.get')).name).toBe('Olga P');
  });

  await test.step('invite accept: the same refusal', async () => {
    const hal = uniqueEmail('hal');
    secrets.push(hal);
    ok(await ann.trpc.mutate('invite.send', { groupSlug: slug, email: hal }));
    const inviteToken = await inviteTokenFrom(hal);
    const halClient = await signInEmail(await newClient(), hal, secrets);
    expect(code(await halClient.trpc.mutate('invite.accept', { groupSlug: slug, token: inviteToken, name: 'ann' }))).toBe('NAME_TAKEN');
    ok(await halClient.trpc.mutate('invite.accept', { groupSlug: slug, token: inviteToken, name: 'Hal' }));
  });
});
