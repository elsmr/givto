// S4 draw & settings (was tests/smoke-s4.mjs, other groups): "not the same as last year" that
// can't be met, the scheduled draw (test-only `draw.runDue`), deleting a group.
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { todayIn } from '@/lib/local-date';
import { OUTPUT_DIR } from '../env';
import { expect, ok, test } from '../fixtures';
import { codeOf, createGroup, editionOf, expectValidDraw, join, memberIdOf, TZ } from './s4-group';

/**
 * `draw.runDue` draws every due edition in the database, so a second copy of the scheduled-draw
 * test (`--repeat-each`) would draw this one's edition early. One at a time across workers; the
 * lock lives in the output dir, which Playwright empties at the start of every run.
 */
const oneAtATime = async (name: string, fn: () => Promise<void>) => {
  const lock = path.join(OUTPUT_DIR, `${name}.lock`);
  for (;;) {
    try {
      await mkdir(lock);
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      await sleep(200);
    }
  }
  try {
    await fn();
  } finally {
    await rm(lock, { recursive: true, force: true });
  }
};

test('"not the same as last year" that makes the draw impossible is refused without names', async ({ signIn, db }) => {
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
  const settings = { ...next, title: 'Secret Santa', exchangeMode: 'inPerson' } as const;
  ok(await ann.trpc.mutate('settings.updateEdition', { ...settings, avoidPreviousGiftees: false }));
  expect((await ann.trpc.mutate('settings.updateEdition', { ...settings, avoidPreviousGiftees: true })).error?.data.details).toEqual({
    avoidPreviousGiftees: true,
  });
  ok(await ann.trpc.mutate('draw.run', next));
  expectValidDraw((await editionOf(db, trio.slug, 2)).draw?.assignments, [a, b, c]);
  // Down to one person: nobody can be matched, the edition goes back to open for the organizer.
  ok(await ann.trpc.mutate('settings.removePerson', { groupSlug: trio.slug, memberId: b }));
  expectValidDraw((await editionOf(db, trio.slug, 2)).draw?.assignments, [a, c]);
  ok(await ann.trpc.mutate('settings.removePerson', { groupSlug: trio.slug, memberId: c }));
  const reopened = await editionOf(db, trio.slug, 2);
  expect(reopened.status).toBe('open');
  expect(reopened.draw?.assignments).toEqual({});
});

// tests/smoke-s4.mjs skipped this without E2E_TEST_HOOKS=1; the e2e server always sets it (api/test-hooks.spec.ts).
test('scheduled draw runs via runDueDraws once its time has come; impossible ones drop the schedule', async ({ signIn, newClient, db }) => {
  const [ann, bob, cee] = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const { trpc } = await newClient();
  const scheduled = await createGroup(ann, 'Scheduled');
  for (const [person, name] of [[bob, 'Bob'], [cee, 'Cee']] as const) await join(person, scheduled, name);
  const tooSmall = await createGroup(ann, 'Too small');
  await join(bob, tooSmall, 'Bob');
  const tomorrow = todayIn(TZ, new Date(Date.now() + 86_400_000));
  const input = { editionNumber: 1, title: 'Secret Santa', exchangeMode: 'inPerson', avoidPreviousGiftees: false, giftDay: { date: '2099-12-24' } } as const;

  await oneAtATime('draw-run-due', async () => {
    ok(await ann.trpc.mutate('settings.updateEdition', { ...input, groupSlug: scheduled.slug, drawOn: tomorrow }));
    const drawAt = (await editionOf(db, scheduled.slug, 1)).drawAt;
    expect(drawAt).toBeTruthy();
    const tooEarly = ok(await trpc.mutate('draw.runDue', { now: new Date(drawAt!.getTime() - 60_000).toISOString() }));
    expect(tooEarly.drawn).not.toContain((await editionOf(db, scheduled.slug, 1))._id);
    expect((await editionOf(db, scheduled.slug, 1)).status).toBe('open');

    ok(await ann.trpc.mutate('settings.updateEdition', { ...input, groupSlug: tooSmall.slug, drawOn: tomorrow }));

    const due = ok(await trpc.mutate('draw.runDue', { now: new Date(drawAt!.getTime() + 60_000).toISOString() }));
    const edition = await editionOf(db, scheduled.slug, 1);
    expect(due.drawn).toContain(edition._id);
    expect(edition.status).toBe('drawn');
    expectValidDraw(edition.draw?.assignments, await Promise.all([ann, bob, cee].map((person) => memberIdOf(db, scheduled.slug, person))));
    const small = await editionOf(db, tooSmall.slug, 1);
    expect(due.failed).toContain(small._id);
    expect(small.status).toBe('open');
    expect(small.drawAt).toBeUndefined();
  });
});

test('delete group: gone for everyone', async ({ signIn }) => {
  const [ann, bob] = await Promise.all([signIn('ann'), signIn('bob')]);
  const doomed = await createGroup(ann, 'Doomed');
  await join(bob, doomed, 'Bob');
  ok(await ann.trpc.mutate('settings.deleteGroup', { groupSlug: doomed.slug }));
  expect(codeOf(await ann.trpc.query('group.get', { groupSlug: doomed.slug }))).toBe('GROUP_NOT_FOUND');
  expect(codeOf(await bob.trpc.query('group.get', { groupSlug: doomed.slug }))).toBe('GROUP_NOT_FOUND');
});
