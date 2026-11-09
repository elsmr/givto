// S6 smoke (gift day: 31, 32, 38 received) against a running `next dev` app
// (tests/env.sh s6 4601 27056 4691). Status transitions use the dev-only `giftday.runDue` trigger.
// Run: BASE_URL=… MAIL_URL=… MONGO_CONTAINER=… pnpm test:smoke:s6
import assert from 'node:assert/strict';

process.env.BASE_URL ??= 'http://localhost:4601';
process.env.MAIL_URL ??= 'http://localhost:4691';
process.env.MONGO_CONTAINER ??= 'givto-mongo-s6';
const { as, mongo, signIn, step, trpc } = await import('./smoke-s2-client.mjs');
const CRON_SECRET = process.env.CRON_SECRET ?? 'test-cron-secret';

const code = (result) => result.error?.data?.appCode;
const ok = (result) => {
  assert.equal(result.error, undefined, JSON.stringify(result.error));
  return result.data;
};
const doc = (js) => JSON.parse(mongo(`EJSON.stringify(${js}, { relaxed: true })`));
const editionFilter = (slug) => `{ groupId: db.groups.findOne({ slug: '${slug}' })._id, number: 1 }`;
const editionOf = (slug) => doc(`db.editions.findOne(${editionFilter(slug)})`);
const setStatus = (slug, status) => mongo(`db.editions.updateOne(${editionFilter(slug)}, { $set: { status: '${status}' } })`);
const memberIdOf = (slug, user) => doc(`db.groups.findOne({ slug: '${slug}' })`).members.find((m) => m.userId === user.id).id;
const namesOf = (slug) => Object.fromEntries(doc(`db.groups.findOne({ slug: '${slug}' })`).members.map((m) => [m.id, m.name]));

const [ann, bob, cee, dan, eve, zed] = await Promise.all(['ann', 'bob', 'cee', 'dan', 'eve', 'zed'].map(signIn));

/** Ann organizes; Bob, Cee and Dan join; names drawn. Gift days stay after 2098-12-25 unless a step moves time. */
const drawnGroup = async (name, { timeZone = 'Europe/Brussels', date = '2099-12-24' } = {}) => {
  const group = ok(await as(ann).mutate('group.create', { name, organizerName: 'Ann', timeZone, giftDay: { date }, exchangeMode: 'inPerson' }));
  for (const [person, personName] of [[bob, 'Bob'], [cee, 'Cee'], [dan, 'Dan']]) {
    ok(await as(person).mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name: personName }));
  }
  ok(await as(ann).mutate('draw.run', { groupSlug: group.slug, editionNumber: 1 }));
  return group;
};

const family = await drawnGroup('Family');
const slug = family.slug;
const edition = { groupSlug: slug, editionNumber: 1 };

await step('unwrap order: organizer-only shuffle, the same for every member, reshuffle changes it', async () => {
  const open = ok(await as(ann).mutate('group.create', { name: 'Open', organizerName: 'Ann', timeZone: 'Europe/Brussels', exchangeMode: 'inPerson' }));
  assert.equal(code(await as(ann).mutate('giftday.shuffle', { groupSlug: open.slug, editionNumber: 1 })), 'NOT_DRAWN');
  assert.equal(code(await as(bob).mutate('giftday.shuffle', edition)), 'NOT_ORGANIZER');
  assert.equal(code(await as(zed).mutate('giftday.shuffle', edition)), 'GROUP_NOT_FOUND');
  assert.equal(code(await as(zed).query('giftday.get', edition)), 'GROUP_NOT_FOUND');
  assert.equal(ok(await as(bob).query('giftday.get', edition)).unwrapOrder, null);

  ok(await as(ann).mutate('giftday.shuffle', edition));
  // Members see the same view, without the order itself (a surprise, see smoke-z2); the presenter has it.
  const orders = await Promise.all([ann, bob, cee, dan].map(async (p) => ok(await as(p).query('giftday.get', edition)).unwrapOrder));
  for (const order of orders) assert.deepEqual(order, orders[0]);
  const presented = ok(await as(ann).query('giftday.presenter', edition)).unwrapOrder;
  const inDraw = Object.keys(editionOf(slug).draw.assignments);
  assert.deepEqual(presented.people.map((p) => p.memberId).toSorted(), inDraw.toSorted());
  assert.deepEqual(presented.people.map((p) => p.memberId), editionOf(slug).unwrapOrder.memberIds);

  const first = presented.people.map((p) => p.memberId).join();
  let changed = false;
  for (let i = 0; i < 10 && !changed; i++) {
    ok(await as(ann).mutate('giftday.shuffle', edition));
    changed = editionOf(slug).unwrapOrder.memberIds.join() !== first;
  }
  assert.ok(changed, 'ten reshuffles never changed the order');
  const after = ok(await as(ann).query('giftday.presenter', edition)).unwrapOrder;
  assert.deepEqual(after.people.map((p) => p.memberId), editionOf(slug).unwrapOrder.memberIds);
});

await step('late joiners unwrap last', async () => {
  ok(await as(eve).mutate('join.accept', { groupSlug: slug, token: family.joinToken, name: 'Eve' }));
  const eveId = memberIdOf(slug, eve);
  assert.ok(eveId in editionOf(slug).draw.assignments, 'Eve was not slotted in');
  assert.equal(ok(await as(ann).query('giftday.presenter', edition)).unwrapOrder.people.at(-1).memberId, eveId);
});

await step('presenter view is organizer-only', async () => {
  assert.equal(code(await as(bob).query('giftday.presenter', edition)), 'NOT_ORGANIZER');
  assert.equal(code(await as(zed).query('giftday.presenter', edition)), 'GROUP_NOT_FOUND');
  const view = ok(await as(ann).query('giftday.presenter', edition));
  assert.equal(view.groupName, 'Family');
  assert.equal(view.status, 'drawn');
  assert.equal(view.unwrapOrder.people.length, 5);
  assert.equal(view.reveal.pairs, null);
});

await step('the big reveal: off by default; pairs never in the API before it is on and gift day', async () => {
  assert.deepEqual(editionOf(slug).reveal, { enabled: false });
  const santaFree = async () => {
    for (const person of [ann, bob]) {
      for (const [path, input] of [['giftday.get', edition], ['group.get', { groupSlug: slug }]]) {
        const text = JSON.stringify(ok(await as(person).query(path, input)));
        assert.ok(!text.includes('santa') && !text.includes('assignments'), `${path} leaks the draw: ${text}`);
      }
    }
  };
  await santaFree();
  assert.equal(code(await as(bob).mutate('giftday.setReveal', { ...edition, enabled: true })), 'NOT_ORGANIZER');
  assert.equal(code(await as(ann).mutate('giftday.reveal', edition)), 'NOT_GIFT_DAY');
  ok(await as(ann).mutate('giftday.setReveal', { ...edition, enabled: true }));
  assert.equal(code(await as(ann).mutate('giftday.reveal', edition)), 'NOT_GIFT_DAY');
  assert.deepEqual(ok(await as(bob).query('giftday.get', edition)).reveal, { enabled: true, revealed: false, pairs: null });
  await santaFree();

  setStatus(slug, 'giftday');
  await santaFree();
  ok(await as(ann).mutate('giftday.setReveal', { ...edition, enabled: false }));
  assert.equal(code(await as(ann).mutate('giftday.reveal', edition)), 'REVEAL_OFF');
  ok(await as(ann).mutate('giftday.setReveal', { ...edition, enabled: true }));
  assert.equal(code(await as(bob).mutate('giftday.reveal', edition)), 'NOT_ORGANIZER');
  ok(await as(ann).mutate('giftday.reveal', edition));

  const names = namesOf(slug);
  const expected = Object.entries(editionOf(slug).draw.assignments)
    .map(([santa, giftee]) => ({ giftee: names[giftee], santa: names[santa] }))
    .toSorted((a, b) => a.giftee.localeCompare(b.giftee));
  for (const person of [bob, cee, eve]) {
    const { reveal } = ok(await as(person).query('giftday.get', edition));
    assert.equal(reveal.revealed, true);
    assert.deepEqual(reveal.pairs.toSorted((a, b) => a.giftee.localeCompare(b.giftee)), expected);
  }
  assert.equal(code(await as(zed).query('giftday.get', edition)), 'GROUP_NOT_FOUND');

  ok(await as(ann).mutate('giftday.setReveal', { ...edition, enabled: false }));
  assert.equal(ok(await as(bob).query('giftday.get', edition)).reveal.pairs, null);
  assert.equal(editionOf(slug).reveal.revealedAt, undefined);
});

await step('received wishes: owner only, hidden from Santas and lists', async () => {
  const wish = ok(await as(bob).mutate('wish.create', { title: 'Board game' }));
  const bobId = memberIdOf(slug, bob);
  const santaId = Object.entries(editionOf(slug).draw.assignments).find(([, giftee]) => giftee === bobId)[0];
  const santa = [ann, cee, dan, eve].find((person) => memberIdOf(slug, person) === santaId);
  const santaSees = async () => ok(await as(santa).query('claim.gifteeWishlist', edition)).wishes.some((w) => w.id === wish.id);
  assert.ok(await santaSees());
  assert.equal(code(await as(santa).mutate('giftday.markReceived', { wishId: wish.id, received: true })), 'NOT_FOUND');
  assert.equal(code(await as(zed).mutate('giftday.markReceived', { wishId: wish.id, received: true })), 'NOT_FOUND');
  assert.ok(await santaSees());

  ok(await as(bob).mutate('giftday.markReceived', { wishId: wish.id, received: true }));
  assert.ok(doc(`db.wishes.findOne({ _id: '${wish.id}' })`).receivedAt);
  assert.equal(await santaSees(), false);
  assert.ok(!ok(await as(bob).query('wish.list')).some((w) => w.id === wish.id));
  assert.ok(!ok(await as(bob).query('wish.groupView', { groupSlug: slug })).some((w) => w.id === wish.id));

  ok(await as(bob).mutate('giftday.markReceived', { wishId: wish.id, received: false }));
  assert.ok(await santaSees());
  ok(await as(bob).mutate('giftday.markReceived', { wishId: wish.id, received: true }));
});

await step('one by one: A 3 gifts, B 1, C 2 → A,B,C,A,C,A; stored, the same for everyone, organizer-only', async () => {
  const trio = (await ok(await as(ann).mutate('group.create', { name: 'Trio', organizerName: 'Ann', timeZone: 'Europe/Brussels', giftDay: { date: '2099-12-24' }, exchangeMode: 'inPerson' })));
  for (const [person, name] of [[bob, 'Bob'], [cee, 'Cee']]) ok(await as(person).mutate('join.accept', { groupSlug: trio.slug, token: trio.joinToken, name }));
  const at = { groupSlug: trio.slug, editionNumber: 1 };
  ok(await as(ann).mutate('draw.run', at));
  assert.equal(code(await as(bob).mutate('giftday.setMode', { ...at, mode: 'oneByOne' })), 'NOT_ORGANIZER');
  ok(await as(ann).mutate('giftday.setMode', { ...at, mode: 'oneByOne' }));
  ok(await as(ann).mutate('giftday.shuffle', at));
  const presenter = async () => ok(await as(ann).query('giftday.presenter', at)).unwrapOrder;
  const [a, b, c] = (await presenter()).people.map((p) => p.memberId);
  const gifts = { [a]: 3, [b]: 1, [c]: 2 };
  const advance = async (action, by = ann) => {
    const { turnsTaken } = await presenter();
    return as(by).mutate('giftday.advance', { ...at, action, turnsTaken });
  };
  assert.equal(code(await advance('start', bob)), 'NOT_ORGANIZER');
  ok(await advance('start'));
  assert.equal(code(await as(ann).mutate('giftday.advance', { ...at, action: 'start', turnsTaken: 0 })), 'EDITION_CHANGED');
  const seen = [];
  for (let i = 0; i < 10; i++) {
    let order = await presenter();
    if (order.finished) break;
    // Before the reel lands nobody else sees whose turn it is; after, everyone sees the same.
    if (!order.currentShown) {
      assert.equal(ok(await as(bob).query('giftday.get', at)).unwrapOrder.current, null);
      ok(await advance('spin'));
      order = await presenter();
    }
    const views = await Promise.all([bob, cee].map(async (p) => ok(await as(p).query('giftday.get', at)).unwrapOrder));
    assert.deepEqual(views[0], views[1]);
    assert.deepEqual(views[0].went.map((p) => p.memberId), [...new Set(seen)]);
    for (const view of views) assert.equal(view.current.memberId, order.current.memberId);
    const current = order.current.memberId;
    seen.push(current);
    gifts[current]--;
    assert.equal(code(await advance(gifts[current] > 0 ? 'more' : 'last', bob)), 'NOT_ORGANIZER');
    if (i === 2) {
      // A refresh (a fresh read) keeps the position, and a stale step is refused.
      assert.equal((await presenter()).current.memberId, current);
      assert.equal(code(await as(ann).mutate('giftday.advance', { ...at, action: 'more', turnsTaken: 0 })), 'EDITION_CHANGED');
    }
    ok(await advance(gifts[current] > 0 ? 'more' : 'last'));
    if (seen.length === 5) assert.equal((await presenter()).currentShown, true, 'one person left: no spin');
  }
  assert.deepEqual(seen, [a, b, c, a, c, a]);
  const end = await presenter();
  assert.equal(end.finished, true);
  assert.deepEqual(end.people.map((p) => p.done), [true, true, true]);

  ok(await advance('back'));
  assert.equal((await presenter()).current.memberId, a);
  ok(await as(ann).mutate('giftday.shuffle', at));
  const reset = await presenter();
  assert.equal(reset.started, false);
  assert.equal(editionOf(trio.slug).unwrapOrder.progress, undefined);

  ok(await as(ann).mutate('giftday.setMode', { ...at, mode: 'allAtOnce' }));
  ok(await advance('start'));
  const once = [];
  for (let order = await presenter(); !order.finished; order = await presenter()) {
    if (!order.currentShown) ok(await advance('spin'));
    once.push((await presenter()).current.memberId);
    ok(await advance('more'));
  }
  assert.deepEqual(once, reset.people.map((p) => p.memberId));
});

await step('shuffling and the reveal stay put once the edition is done', async () => {
  setStatus(slug, 'done');
  assert.equal(code(await as(ann).mutate('giftday.shuffle', edition)), 'EDITION_CLOSED');
  ok(await as(ann).mutate('giftday.setReveal', { ...edition, enabled: true }));
  ok(await as(ann).mutate('giftday.reveal', edition));
  assert.equal(ok(await as(dan).query('giftday.get', edition)).reveal.revealed, true);
});

await step('the cron endpoint runs the gift day job', async () => {
  const res = await fetch(`${process.env.BASE_URL}/api/cron/giftday`, { headers: { authorization: `Bearer ${CRON_SECRET}` } });
  const body = await res.json();
  assert.equal(res.status, 200, JSON.stringify(body));
  assert.ok(Array.isArray(body.result.giftday) && Array.isArray(body.result.done), JSON.stringify(body));
});

// `giftday.runDue` is closed in production builds (`next start`): there the step only checks that.
const probe = await trpc('giftday.runDue', { now: '2000-01-01T00:00:00.000Z' }, { mutation: true });
if (code(probe) === 'NOT_FOUND') {
  console.log('ok  giftday.runDue is closed in this production build; transition step skipped (run against next dev)');
} else {
  await step('status follows the local date: Auckland (ahead of UTC) and Los Angeles (behind)', async () => {
    // 2098-12-24 is gift day in both. Auckland is UTC+13 in December, Los Angeles UTC−8.
    const auckland = (await drawnGroup('Auckland', { timeZone: 'Pacific/Auckland', date: '2098-12-24' })).slug;
    const losAngeles = (await drawnGroup('Los Angeles', { timeZone: 'America/Los_Angeles', date: '2098-12-24' })).slug;
    const runAt = async (iso) => ok(await trpc('giftday.runDue', { now: iso }, { mutation: true }));
    const statuses = () => [editionOf(auckland).status, editionOf(losAngeles).status];

    await runAt('2098-12-23T10:00:00.000Z'); // Auckland 23rd 23:00, LA 23rd 02:00
    assert.deepEqual(statuses(), ['drawn', 'drawn']);
    const moved = await runAt('2098-12-23T11:30:00.000Z'); // Auckland 24th 00:30, LA 23rd 03:30
    assert.deepEqual(statuses(), ['giftday', 'drawn']);
    assert.ok(moved.giftday.includes(editionOf(auckland)._id));
    const entered = editionOf(auckland);
    assert.ok(entered.statusChangedAt.giftday);
    assert.deepEqual(entered.unwrapOrder.memberIds.toSorted(), Object.keys(entered.draw.assignments).toSorted());
    assert.deepEqual((await runAt('2098-12-23T11:30:00.000Z')).giftday, [], 'not idempotent');

    await runAt('2098-12-24T08:30:00.000Z'); // Auckland 24th 21:30, LA 24th 00:30
    assert.deepEqual(statuses(), ['giftday', 'giftday']);
    await runAt('2098-12-24T11:30:00.000Z'); // Auckland 25th 00:30, LA 24th 03:30
    assert.deepEqual(statuses(), ['done', 'giftday']);
    await runAt('2098-12-25T07:30:00.000Z'); // UTC is on the 25th, LA still 24th 23:30
    assert.deepEqual(statuses(), ['done', 'giftday']);
    await runAt('2098-12-25T08:30:00.000Z'); // LA 25th 00:30
    assert.deepEqual(statuses(), ['done', 'done']);

    // A day missed entirely (cron down): drawn goes straight to done.
    const missed = (await drawnGroup('Missed', { date: '2098-12-20' })).slug;
    await runAt('2098-12-25T08:30:00.000Z');
    assert.equal(editionOf(missed).status, 'done');
  });
}

console.log('smoke-s6: all ok');
