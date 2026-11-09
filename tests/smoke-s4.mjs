// S4 smoke (draw & settings: 27, 28, 33, 34, 47, 48) against a running `next dev` app
// (tests/env.sh s4 4401 27055 4491). The scheduled draw uses the dev-only `draw.runDue` trigger.
// Run: BASE_URL=… MAIL_URL=… MONGO_CONTAINER=… pnpm test:smoke:s4
import assert from 'node:assert/strict';
import { editionCalendarEvents, toIcs } from '../lib/calendar.ts';
import { todayIn } from '../lib/local-date.ts';
import { as, mongo, signIn, step, trpc } from './smoke-s2-client.mjs';

const TZ = 'Europe/Brussels';
const code = (result) => result.error?.data?.appCode;
const ok = (result) => {
  assert.equal(result.error, undefined, JSON.stringify(result.error));
  return result.data;
};
const doc = (js) => JSON.parse(mongo(`EJSON.stringify(${js}, { relaxed: true })`));
const editionOf = (slug, number) =>
  doc(`db.editions.findOne({ groupId: db.groups.findOne({ slug: '${slug}' })._id, number: ${number} })`);
const groupOf = (slug) => doc(`db.groups.findOne({ slug: '${slug}' })`);

/** A valid draw: a permutation of exactly `ids`, nobody themselves, no rule broken. */
const assertValidDraw = (assignments, ids, exclusions = []) => {
  assert.deepEqual(Object.keys(assignments).toSorted(), ids.toSorted());
  assert.deepEqual(Object.values(assignments).toSorted(), ids.toSorted());
  for (const [santa, giftee] of Object.entries(assignments)) assert.notEqual(santa, giftee);
  for (const { from, to } of exclusions) assert.notEqual(assignments[from], to, `${from} drew ${to}`);
};
const rulesOf = (group) => [
  ...group.exclusions,
  ...group.households.flatMap(({ memberIds }) => memberIds.flatMap((from) => memberIds.filter((to) => to !== from).map((to) => ({ from, to })))),
];

const [ann, bob, cee, dan, eve, fay, zed] = await Promise.all(['ann', 'bob', 'cee', 'dan', 'eve', 'fay', 'zed'].map(signIn));

const createGroup = async (name, giftDay = { date: '2099-12-24', time: '18:00', place: 'Grandma’s' }) =>
  ok(await as(ann).mutate('group.create', { name, organizerName: 'Ann', timeZone: TZ, giftDay, exchangeMode: 'both' }));
const join = async (person, { slug, joinToken }, name) =>
  ok(await as(person).mutate('join.accept', { groupSlug: slug, token: joinToken, name }));
const memberIdOf = (slug, user) => groupOf(slug).members.find((m) => m.userId === user.id).id;

const family = await createGroup('Family');
const slug = family.slug;
for (const [person, name] of [[bob, 'Bob'], [cee, 'Cee'], [dan, 'Dan'], [eve, 'Eve']]) await join(person, family, name);
const id = Object.fromEntries([['ann', ann], ['bob', bob], ['cee', cee], ['dan', dan], ['eve', eve]].map(([n, u]) => [n, memberIdOf(slug, u)]));
const edition1 = { groupSlug: slug, editionNumber: 1 };

await step('settings are organizer-only; outsiders get GROUP_NOT_FOUND', async () => {
  const editionInput = { ...edition1, title: 'Hacked', exchangeMode: 'inPerson', avoidPreviousGiftees: false };
  for (const [path, input] of [
    ['settings.rename', { groupSlug: slug, name: 'Hacked' }],
    ['settings.updateEdition', editionInput],
    ['settings.setParticipants', { ...edition1, memberIds: [id.bob] }],
    ['settings.removePerson', { groupSlug: slug, memberId: id.cee }],
    ['settings.deleteGroup', { groupSlug: slug }],
    ['draw.run', edition1],
    ['draw.redraw', edition1],
    ['edition.startNext', { groupSlug: slug }],
  ]) {
    assert.equal(code(await as(bob).mutate(path, input)), 'NOT_ORGANIZER', path);
    assert.equal(code(await as(zed).mutate(path, input)), 'GROUP_NOT_FOUND', path);
  }
  assert.equal(groupOf(slug).name, 'Family');
  ok(await as(ann).mutate('settings.rename', { groupSlug: slug, name: 'The Family' }));
  assert.equal(groupOf(slug).name, 'The Family');
});

await step('edition dates and budget are validated server-side', async () => {
  const base = { ...edition1, title: 'Secret Santa 2099', exchangeMode: 'byPost', avoidPreviousGiftees: false, giftDay: { date: '2099-12-24' } };
  assert.equal(code(await as(ann).mutate('settings.updateEdition', { ...base, giftDay: { date: '2001-12-24' } })), 'DATE_IN_PAST');
  assert.equal(code(await as(ann).mutate('settings.updateEdition', { ...base, drawOn: '2001-12-01' })), 'DATE_IN_PAST');
  assert.equal(code(await as(ann).mutate('settings.updateEdition', { ...base, drawOn: '2099-12-24' })), 'DATES_OUT_OF_ORDER');
  const late = await as(ann).mutate('settings.updateEdition', { ...base, wishlistBy: '2099-12-25' });
  assert.equal(code(late), 'INVALID_INPUT');
  assert.ok(late.error.data.issues.some((issue) => issue.message === 'dates_out_of_order'));
  const range = await as(ann).mutate('settings.updateEdition', { ...base, budget: { currency: 'EUR', amount: 3000, maxAmount: 2000 } });
  assert.equal(code(range), 'INVALID_INPUT');
  assert.equal(code(await as(ann).mutate('settings.updateEdition', { ...base, budget: { currency: 'EUR', amount: -1 } })), 'INVALID_INPUT');
  const before = editionOf(slug, 1);
  ok(await as(ann).mutate('settings.updateEdition', {
    ...base,
    giftDay: { date: '2099-12-24', time: '18:00', place: undefined },
    wishlistBy: '2099-12-10',
    postBy: '2099-12-19',
    budget: { currency: 'EUR', amount: 2000, maxAmount: undefined },
    notes: 'Something handmade.\nNo socks.',
  }));
  const after = editionOf(slug, 1);
  assert.deepEqual(after.giftDay, { date: '2099-12-24', time: '18:00' });
  assert.deepEqual(after.budget, { currency: 'EUR', amount: 2000 });
  assert.equal(after.calendarSequence, (before.calendarSequence ?? 0) + 1);
  assert.equal(mongo(`db.editions.countDocuments({ _id: '${after._id}', $or: [{ 'giftDay.place': { $type: 'null' } }, { 'budget.maxAmount': { $type: 'null' } }, { drawAt: { $type: 'null' } }] })`), '0');
});

await step('too few people or impossible rules: the draw is refused, naming who is stuck', async () => {
  ok(await as(ann).mutate('settings.setParticipants', { ...edition1, memberIds: [id.ann, id.bob] }));
  assert.equal(code(await as(ann).mutate('draw.run', edition1)), 'TOO_FEW_PEOPLE');
  // Below the minimum the keep-apart check is skipped, so an impossible household can be saved…
  ok(await as(ann).mutate('group.setKeepApart', { groupSlug: slug, households: [[id.ann, id.bob, id.cee]], pairs: [] }));
  ok(await as(ann).mutate('settings.setParticipants', { ...edition1, memberIds: Object.values(id) }));
  const refused = await as(ann).mutate('draw.run', edition1);
  assert.equal(code(refused), 'DRAW_IMPOSSIBLE');
  // …and the draw names it: Ann, Bob and Cee can only give to Dan and Eve.
  const { givers, receivers } = refused.error.data.details;
  assert.ok(givers.length > receivers.length && givers.every((g) => [id.ann, id.bob, id.cee].includes(g)), JSON.stringify(givers));
  assert.deepEqual(receivers.toSorted(), [id.dan, id.eve].toSorted());
  assert.equal(editionOf(slug, 1).status, 'open');
  ok(await as(ann).mutate('group.setKeepApart', { groupSlug: slug, households: [[id.ann, id.bob]], pairs: [[id.cee, id.dan]] }));
});

await step('draw now: everyone has a valid giftee, nobody themselves or kept apart', async () => {
  ok(await as(ann).mutate('draw.run', edition1));
  const edition = editionOf(slug, 1);
  assert.equal(edition.status, 'drawn');
  assertValidDraw(edition.draw.assignments, Object.values(id), rulesOf(groupOf(slug)));
  assert.equal(code(await as(ann).mutate('draw.run', edition1)), 'ALREADY_DRAWN');
  assert.equal(code(await as(ann).mutate('settings.setParticipants', { ...edition1, memberIds: [id.ann] })), 'ALREADY_DRAWN');
});

await step('members read only their own giftee (API)', async () => {
  const { assignments } = editionOf(slug, 1).draw;
  const names = Object.fromEntries(groupOf(slug).members.map((m) => [m.id, m.name]));
  for (const [person, memberId] of [[ann, id.ann], [bob, id.bob], [eve, id.eve]]) {
    const mine = ok(await as(person).query('draw.mine', edition1));
    assert.deepEqual(mine.giftee, { name: names[assignments[memberId]] });
    const home = JSON.stringify(ok(await as(person).query('group.get', { groupSlug: slug })));
    assert.ok(!home.includes('assignments') && !home.includes('"draw"'), 'group.get leaks the draw');
  }
  assert.equal(code(await as(zed).query('draw.mine', edition1)), 'GROUP_NOT_FOUND');
});

await step('late joiner is slotted in: only one Santa’s giftee changes, and they are told', async () => {
  const before = editionOf(slug, 1).draw.assignments;
  await join(fay, family, 'Fay');
  id.fay = memberIdOf(slug, fay);
  const after = editionOf(slug, 1);
  assertValidDraw(after.draw.assignments, Object.values(id), rulesOf(groupOf(slug)));
  const changed = Object.keys(before).filter((santa) => before[santa] !== after.draw.assignments[santa]);
  assert.equal(changed.length, 1);
  const [santa] = changed;
  assert.equal(after.draw.assignments[santa], id.fay);
  assert.equal(after.draw.assignments[id.fay], before[santa]);
  assert.ok(after.participants.find((p) => p.memberId === santa).gifteeChangedAt);
  assert.equal(after.participants.filter((p) => p.gifteeChangedAt).length, 1);
  assert.deepEqual(ok(await as(fay).query('draw.mine', edition1)).changedAt, null);
  const told = [ann, bob, cee, dan, eve].find((person) => memberIdOf(slug, person) === santa);
  assert.ok(ok(await as(told).query('draw.mine', edition1)).changedAt);
  ok(await as(told).mutate('draw.seenChange', edition1));
  assert.equal(ok(await as(told).query('draw.mine', edition1)).changedAt, null);
});

await step('leave and remove after the draw: everyone left keeps a valid giftee', async () => {
  ok(await as(cee).mutate('membership.leave', { groupSlug: slug }));
  delete id.cee;
  assertValidDraw(editionOf(slug, 1).draw.assignments, Object.values(id), rulesOf(groupOf(slug)));
  assert.equal(code(await as(cee).query('group.get', { groupSlug: slug })), 'GROUP_NOT_FOUND');
  assert.equal(code(await as(ann).mutate('settings.removePerson', { groupSlug: slug, memberId: id.ann })), 'ORGANIZER_CANNOT_LEAVE');
  ok(await as(ann).mutate('settings.removePerson', { groupSlug: slug, memberId: id.dan }));
  delete id.dan;
  assertValidDraw(editionOf(slug, 1).draw.assignments, Object.values(id), rulesOf(groupOf(slug)));
  assert.equal(groupOf(slug).members.find((m) => m.userId === dan.id).status, 'removed');
});

await step('re-draw keeps a valid draw and the old one in history', async () => {
  ok(await as(ann).mutate('draw.redraw', edition1));
  const { draw } = editionOf(slug, 1);
  assertValidDraw(draw.assignments, Object.values(id), rulesOf(groupOf(slug)));
  assert.equal(draw.history.length, 1);
});

await step('next edition: draft with everyone ticked, untick, open; not the same as last year, never exposed', async () => {
  assert.equal(code(await as(ann).mutate('edition.open', edition1)), 'EDITION_CHANGED');
  assert.deepEqual(ok(await as(ann).mutate('edition.startNext', { groupSlug: slug })), { number: 2 });
  assert.equal(code(await as(ann).mutate('edition.startNext', { groupSlug: slug })), 'EDITION_IN_PROGRESS');
  const draft = editionOf(slug, 2);
  assert.equal(draft.status, 'draft');
  assert.equal(draft.avoidPreviousGiftees, true);
  assert.deepEqual(draft.participants.filter((p) => p.participates).map((p) => p.memberId).toSorted(), Object.values(id).toSorted());
  // Re-join Dan so there's someone to untick, then untick him.
  await join(dan, family, 'Dan');
  id.dan = memberIdOf(slug, dan);
  const everyone = Object.values(id);
  ok(await as(ann).mutate('settings.setParticipants', { groupSlug: slug, editionNumber: 2, memberIds: everyone.filter((m) => m !== id.dan) }));
  assert.equal(editionOf(slug, 2).participants.find((p) => p.memberId === id.dan).participates, false);
  ok(await as(ann).mutate('edition.open', { groupSlug: slug, editionNumber: 2 }));
  ok(await as(ann).mutate('draw.run', { groupSlug: slug, editionNumber: 2 }));
  const last = editionOf(slug, 1).draw.assignments;
  const avoid = Object.entries(last).map(([from, to]) => ({ from, to }));
  const inDraw = everyone.filter((m) => m !== id.dan);
  for (let i = 0; i < 5; i++) {
    if (i > 0) ok(await as(ann).mutate('draw.redraw', { groupSlug: slug, editionNumber: 2 }));
    assertValidDraw(editionOf(slug, 2).draw.assignments, inDraw, [...rulesOf(groupOf(slug)), ...avoid]);
  }
  const home = ok(await as(ann).query('group.get', { groupSlug: slug, editionNumber: 2 }));
  assert.ok(!JSON.stringify(home).includes('assignments'));
  assert.equal(home.edition.hasPreviousEdition, true);
  assert.deepEqual(home.editions.map((e) => e.number), [2, 1]);
  const past = ok(await as(bob).query('group.get', { groupSlug: slug, editionNumber: 1 }));
  assert.equal(past.edition.isCurrent, false);
  assert.equal(code(await as(bob).query('group.get', { groupSlug: slug, editionNumber: 9 })), 'EDITION_NOT_FOUND');
});

await step('"not the same as last year" that makes the draw impossible is refused without names', async () => {
  const trio = await createGroup('Trio');
  for (const [person, name] of [[bob, 'Bob'], [cee, 'Cee'], [dan, 'Dan']]) await join(person, trio, name);
  const [a, b, c, d] = [ann, bob, cee, dan].map((person) => memberIdOf(trio.slug, person));
  // Last year Ann and Bob drew each other; this year without Dan they can only both give to Cee.
  mongo(`db.editions.updateOne({ groupId: db.groups.findOne({ slug: '${trio.slug}' })._id, number: 1 },
    { $set: { status: 'done', draw: { assignments: { '${a}': '${b}', '${b}': '${a}', '${c}': '${d}', '${d}': '${c}' }, drawnAt: new Date(), history: [] } } })`);
  ok(await as(ann).mutate('edition.startNext', { groupSlug: trio.slug }));
  const next = { groupSlug: trio.slug, editionNumber: 2 };
  ok(await as(ann).mutate('settings.setParticipants', { ...next, memberIds: [a, b, c] }));
  const refused = await as(ann).mutate('draw.run', next);
  assert.equal(code(refused), 'DRAW_IMPOSSIBLE');
  assert.deepEqual(refused.error.data.details, { avoidPreviousGiftees: true });
  const settings = { ...next, title: 'Secret Santa', exchangeMode: 'inPerson' };
  ok(await as(ann).mutate('settings.updateEdition', { ...settings, avoidPreviousGiftees: false }));
  assert.deepEqual((await as(ann).mutate('settings.updateEdition', { ...settings, avoidPreviousGiftees: true })).error.data.details, { avoidPreviousGiftees: true });
  ok(await as(ann).mutate('draw.run', next));
  assertValidDraw(editionOf(trio.slug, 2).draw.assignments, [a, b, c]);
  // Down to one person: nobody can be matched, the edition goes back to open for the organizer.
  ok(await as(ann).mutate('settings.removePerson', { groupSlug: trio.slug, memberId: b }));
  assertValidDraw(editionOf(trio.slug, 2).draw.assignments, [a, c]);
  ok(await as(ann).mutate('settings.removePerson', { groupSlug: trio.slug, memberId: c }));
  const reopened = editionOf(trio.slug, 2);
  assert.equal(reopened.status, 'open');
  assert.deepEqual(reopened.draw.assignments, {});
});

// `draw.runDue` is closed in production builds (`next start`): there the step only checks that.
const probe = await trpc('draw.runDue', { now: '2000-01-01T00:00:00.000Z' }, { mutation: true });
const devTrigger = code(probe) !== 'NOT_FOUND';
if (!devTrigger) console.log('ok  draw.runDue is closed in this production build; scheduled draw step skipped (run against next dev)');
if (devTrigger) await step('scheduled draw runs via runDueDraws once its time has come; impossible ones drop the schedule', async () => {
  const scheduled = await createGroup('Scheduled');
  for (const [person, name] of [[bob, 'Bob'], [cee, 'Cee']]) await join(person, scheduled, name);
  const tomorrow = todayIn(TZ, new Date(Date.now() + 86_400_000));
  const input = { groupSlug: scheduled.slug, editionNumber: 1, title: 'Secret Santa', exchangeMode: 'inPerson', avoidPreviousGiftees: false, giftDay: { date: '2099-12-24' } };
  ok(await as(ann).mutate('settings.updateEdition', { ...input, drawOn: tomorrow }));
  const drawAt = editionOf(scheduled.slug, 1).drawAt?.$date;
  assert.ok(drawAt);
  const tooEarly = ok(await trpc('draw.runDue', { now: new Date(Date.parse(drawAt) - 60_000).toISOString() }, { mutation: true }));
  assert.ok(!tooEarly.drawn.includes(editionOf(scheduled.slug, 1)._id));
  assert.equal(editionOf(scheduled.slug, 1).status, 'open');

  const tooSmall = await createGroup('Too small');
  await join(bob, tooSmall, 'Bob');
  ok(await as(ann).mutate('settings.updateEdition', { ...input, groupSlug: tooSmall.slug, drawOn: tomorrow }));

  const due = ok(await trpc('draw.runDue', { now: new Date(Date.parse(drawAt) + 60_000).toISOString() }, { mutation: true }));
  const edition = editionOf(scheduled.slug, 1);
  assert.ok(due.drawn.includes(edition._id));
  assert.equal(edition.status, 'drawn');
  assertValidDraw(edition.draw.assignments, [ann, bob, cee].map((person) => memberIdOf(scheduled.slug, person)));
  const small = editionOf(tooSmall.slug, 1);
  assert.ok(due.failed.includes(small._id));
  assert.equal(small.status, 'open');
  assert.equal(small.drawAt, undefined);

});

await step('.ics is valid: stable UID, SEQUENCE bumps when gift day changes', async () => {
  const texts = { giftDay: 'Gift day', postBy: 'Post your gift', description: 'https://givto.app/g/x' };
  const icsFor = async () => {
    const { edition } = ok(await as(bob).query('group.get', { groupSlug: slug, editionNumber: 1 }));
    return toIcs(editionCalendarEvents({ groupSlug: slug, editionNumber: 1, ...edition }, texts), new Date('2099-01-01T00:00:00Z'));
  };
  const first = await icsFor();
  const lines = first.split('\r\n');
  assert.equal(lines[0], 'BEGIN:VCALENDAR');
  assert.equal(lines.at(-2), 'END:VCALENDAR');
  assert.equal(lines.at(-1), '');
  assert.ok(lines.every((line) => new TextEncoder().encode(line).length <= 75));
  assert.equal(lines.filter((line) => line === 'BEGIN:VEVENT').length, 2);
  assert.ok(lines.includes('DTSTART:20991224T170000Z'), first);
  assert.ok(lines.includes('DTSTART;VALUE=DATE:20991219') && lines.includes('DTEND;VALUE=DATE:20991220'), first);
  const uids = (ics) => ics.split('\r\n').filter((line) => line.startsWith('UID:'));
  const sequence = (ics) => Number(ics.split('\r\n').find((line) => line.startsWith('SEQUENCE:')).slice(9));
  const base = { ...edition1, title: 'Secret Santa 2099', exchangeMode: 'byPost', avoidPreviousGiftees: false, postBy: '2099-12-19' };
  ok(await as(ann).mutate('settings.updateEdition', { ...base, giftDay: { date: '2099-12-23' } }));
  const second = await icsFor();
  assert.deepEqual(uids(second), uids(first));
  assert.equal(sequence(second), sequence(first) + 1);
  assert.ok(second.includes('DTSTART;VALUE=DATE:20991223'));
});

await step('delete group: gone for everyone', async () => {
  const doomed = await createGroup('Doomed');
  await join(bob, doomed, 'Bob');
  ok(await as(ann).mutate('settings.deleteGroup', { groupSlug: doomed.slug }));
  assert.equal(code(await as(ann).query('group.get', { groupSlug: doomed.slug })), 'GROUP_NOT_FOUND');
  assert.equal(code(await as(bob).query('group.get', { groupSlug: doomed.slug })), 'GROUP_NOT_FOUND');
});

console.log('smoke-s4: all ok');
