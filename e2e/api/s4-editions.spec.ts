// S4 draw & settings (other groups): "not the same as last time" that
// can't be met, the scheduled draw (test-only `draw.runDue`, scoped to its editions), deleting a group.
import { expect, ok, test } from '../fixtures';
import { codeOf, createGroup, editionOf, expectValidDraw, join, memberIdOf } from './s4-group';

test('"not the same as last time" that makes the draw impossible is refused without names', async ({ signIn, db }) => {
  const [ann, bob, cee, dan] = await Promise.all(['ann', 'bob', 'cee', 'dan'].map((name) => signIn(name)));
  const trio = await createGroup(ann, 'Trio');
  for (const [person, name] of [[bob, 'Bob'], [cee, 'Cee'], [dan, 'Dan']] as const) await join(person, trio, name);
  const [a, b, c, d] = await Promise.all([ann, bob, cee, dan].map((person) => memberIdOf(db, trio.slug, person)));
  // Last year Ann and Bob drew each other; this year without Dan they can only both give to Cee.
  await db.editions.updateOne(
    { _id: (await editionOf(db, trio.slug, 1))._id },
    { $set: { status: 'done', draw: { assignments: { [a]: b, [b]: a, [c]: d, [d]: c }, drawnAt: new Date(), history: [] } } }
  );
  ok(await ann.trpc.mutate('edition.startNext', { groupSlug: trio.slug }));
  const next = { groupSlug: trio.slug, editionNumber: 2 };
  ok(await ann.trpc.mutate('settings.setParticipants', { ...next, memberIds: [a, b, c] }));
  const refused = await ann.trpc.mutate('draw.run', next);
  expect(codeOf(refused)).toBe('DRAW_IMPOSSIBLE');
  expect(refused.error?.data.details).toEqual({ avoidPreviousGiftees: true });
  ok(await ann.trpc.mutate('settings.setAvoidPrevious', { ...next, enabled: false }));
  expect((await ann.trpc.mutate('settings.setAvoidPrevious', { ...next, enabled: true })).error?.data.details).toEqual({ avoidPreviousGiftees: true });
  ok(await ann.trpc.mutate('draw.run', next));
  expect(codeOf(await ann.trpc.mutate('settings.setAvoidPrevious', { ...next, enabled: false }))).toBe('ALREADY_DRAWN');
  expectValidDraw((await editionOf(db, trio.slug, 2)).draw?.assignments, [a, b, c]);
  // Down to one person: nobody can be matched, the edition goes back to open for the organizer.
  ok(await ann.trpc.mutate('settings.removePerson', { groupSlug: trio.slug, memberId: b }));
  expectValidDraw((await editionOf(db, trio.slug, 2)).draw?.assignments, [a, c]);
  ok(await ann.trpc.mutate('settings.removePerson', { groupSlug: trio.slug, memberId: c }));
  const reopened = await editionOf(db, trio.slug, 2);
  expect(reopened.status).toBe('open');
  expect(reopened.draw?.assignments).toEqual({});
});

// Draw dates in 2099 and `editionIds` on every runDue: it never draws another test's edition.
test('scheduled draw runs via runDueDraws once its time has come; impossible ones drop the schedule', async ({ signIn, newClient, db }) => {
  const [ann, bob, cee] = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const { trpc } = await newClient();
  const scheduled = await createGroup(ann, 'Scheduled');
  const tooSmall = await createGroup(ann, 'Too small');
  const bystander = await createGroup(ann, 'Bystander');
  for (const [person, name] of [[bob, 'Bob'], [cee, 'Cee']] as const) for (const group of [scheduled, bystander]) await join(person, group, name);
  await join(bob, tooSmall, 'Bob');
  const input = { editionNumber: 1, title: 'Secret Santa', exchangeMode: 'inPerson', giftDay: { date: '2099-12-24' }, drawOn: '2099-12-01' } as const;
  for (const { slug } of [scheduled, tooSmall, bystander]) ok(await ann.trpc.mutate('settings.updateEdition', { ...input, groupSlug: slug }));
  const editionIds = [(await editionOf(db, scheduled.slug, 1))._id, (await editionOf(db, tooSmall.slug, 1))._id];
  const drawAt = (await editionOf(db, scheduled.slug, 1)).drawAt;
  expect(drawAt).toBeTruthy();
  const runAt = async (offset: number) => ok(await trpc.mutate('draw.runDue', { now: new Date(drawAt!.getTime() + offset).toISOString(), editionIds }));

  const tooEarly = await runAt(-60_000);
  expect(tooEarly.drawn).not.toContain((await editionOf(db, scheduled.slug, 1))._id);
  expect((await editionOf(db, scheduled.slug, 1)).status).toBe('open');

  const due = await runAt(60_000);
  const edition = await editionOf(db, scheduled.slug, 1);
  expect(due.drawn).toContain(edition._id);
  expect(edition.status).toBe('drawn');
  expectValidDraw(edition.draw?.assignments, await Promise.all([ann, bob, cee].map((person) => memberIdOf(db, scheduled.slug, person))));
  const small = await editionOf(db, tooSmall.slug, 1);
  expect(due.failed).toContain(small._id);
  expect(small.status).toBe('open');
  expect(small.drawAt).toBeUndefined();
  // Just as due, but not in `editionIds`: left alone.
  const other = await editionOf(db, bystander.slug, 1);
  expect([...due.drawn, ...due.failed]).not.toContain(other._id);
  expect(other.status).toBe('open');
  expect(other.drawAt).toEqual(drawAt);
});

test('time zone: organizer only; a scheduled draw keeps its local date', async ({ signIn }) => {
  const [ann, bob] = await Promise.all([signIn('ann'), signIn('bob')]);
  const group = await createGroup(ann, 'Moving');
  await join(bob, group, 'Bob');
  const input = { groupSlug: group.slug, editionNumber: 1, title: 'Secret Santa', exchangeMode: 'inPerson', giftDay: { date: '2099-12-24' }, drawOn: '2099-12-01' } as const;
  ok(await ann.trpc.mutate('settings.updateEdition', input));
  expect(codeOf(await bob.trpc.mutate('settings.setTimeZone', { groupSlug: group.slug, timeZone: 'America/New_York' }))).toBe('NOT_ORGANIZER');
  ok(await ann.trpc.mutate('settings.setTimeZone', { groupSlug: group.slug, timeZone: 'America/New_York' }));
  const view = ok(await ann.trpc.query('group.get', { groupSlug: group.slug }));
  expect(view.timeZone).toBe('America/New_York');
  expect(view.edition?.timeZone).toBe('America/New_York');
  expect(view.edition?.drawAt).toEqual(new Date('2099-12-01T14:00:00Z'));
  expect(view.edition?.calendarSequence).toBe(2);
});

test('delete group: gone for everyone', async ({ signIn }) => {
  const [ann, bob] = await Promise.all([signIn('ann'), signIn('bob')]);
  const doomed = await createGroup(ann, 'Doomed');
  await join(bob, doomed, 'Bob');
  ok(await ann.trpc.mutate('settings.deleteGroup', { groupSlug: doomed.slug }));
  expect(codeOf(await ann.trpc.query('group.get', { groupSlug: doomed.slug }))).toBe('GROUP_NOT_FOUND');
  expect(codeOf(await bob.trpc.query('group.get', { groupSlug: doomed.slug }))).toBe('GROUP_NOT_FOUND');
});
