// Z2 smoke: the unwrap order stays a surprise (32, owner): on gift day members only learn who's
// unwrapping now and who already went; the organizer's presenter view keeps the full order.
// Run: BASE_URL=… MAIL_URL=… MONGO_CONTAINER=… pnpm test:smoke:z2 (tests/env.sh z2 4901 27059 4991)
import assert from 'node:assert/strict';

process.env.BASE_URL ??= 'http://localhost:4901';
process.env.MAIL_URL ??= 'http://localhost:4991';
process.env.MONGO_CONTAINER ??= 'givto-mongo-z2';
const { as, mongo, signIn, step } = await import('./smoke-s2-client.mjs');

const ok = (result) => {
  assert.equal(result.error, undefined, JSON.stringify(result.error));
  return result.data;
};
const editionFilter = (slug) => `{ groupId: db.groups.findOne({ slug: '${slug}' })._id, number: 1 }`;

const [ann, bob, cee, dan] = await Promise.all(['z2ann', 'z2bob', 'z2cee', 'z2dan'].map(signIn));
const group = ok(await as(ann).mutate('group.create', {
  name: 'Surprise',
  organizerName: 'Ann',
  timeZone: 'Europe/Brussels',
  giftDay: { date: '2099-12-24' },
  exchangeMode: 'inPerson',
}));
for (const [person, name] of [[bob, 'Bob'], [cee, 'Cee'], [dan, 'Dan']]) {
  ok(await as(person).mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name }));
}
const at = { groupSlug: group.slug, editionNumber: 1 };
ok(await as(ann).mutate('draw.run', at));
ok(await as(ann).mutate('giftday.shuffle', at));
mongo(`db.editions.updateOne(${editionFilter(group.slug)}, { $set: { status: 'giftday' } })`);

const presenter = async () => ok(await as(ann).query('giftday.presenter', at)).unwrapOrder;
const advance = async (action) => ok(await as(ann).mutate('giftday.advance', { ...at, action, turnsTaken: (await presenter()).turnsTaken }));
const order = (await presenter()).people.map((p) => p.memberId);

/** Nobody's `giftday.get` (organizer included) names anyone who hasn't unwrapped yet, apart from who's on now. */
const assertNoFutureOrder = async (shownIds) => {
  for (const person of [ann, bob, cee, dan]) {
    const view = ok(await as(person).query('giftday.get', at));
    const text = JSON.stringify(view);
    for (const memberId of order.filter((id) => !shownIds.includes(id))) {
      assert.ok(!text.includes(memberId), `giftday.get leaks a future turn: ${text}`);
    }
    assert.equal(view.unwrapOrder.next, undefined, 'giftday.get names who is up next');
    assert.equal(view.unwrapOrder.people, undefined, 'giftday.get lists the whole order');
  }
};

await step('presenter keeps the full order on gift day', async () => {
  assert.equal(order.length, 4);
});

await step('before the start members see no order at all', async () => {
  await assertNoFutureOrder([]);
  const view = ok(await as(bob).query('giftday.get', at)).unwrapOrder;
  assert.deepEqual(view.went, []);
  assert.equal(view.current, null);
});

await step('during the unwrapping: who is on now and who already went, nothing ahead', async () => {
  await advance('start');
  await assertNoFutureOrder([]);
  await advance('spin');
  await assertNoFutureOrder([order[0]]);
  assert.equal(ok(await as(cee).query('giftday.get', at)).unwrapOrder.current.memberId, order[0]);
  await advance('more');
  await assertNoFutureOrder([order[0]]);
  await advance('spin');
  await assertNoFutureOrder([order[0], order[1]]);
  const view = ok(await as(dan).query('giftday.get', at)).unwrapOrder;
  assert.deepEqual(view.went.map((p) => p.memberId), [order[0]]);
  assert.equal(view.went[0].done, true);
  assert.equal(view.current.memberId, order[1]);
});

await step('the big reveal does not list the pairs in unwrap order for members', async () => {
  ok(await as(ann).mutate('giftday.setReveal', { ...at, enabled: true }));
  ok(await as(ann).mutate('giftday.reveal', at));
  const { pairs } = ok(await as(bob).query('giftday.get', at)).reveal;
  const giftees = pairs.map((p) => p.giftee);
  assert.deepEqual(giftees, giftees.toSorted((a, b) => a.localeCompare(b)));
});

console.log('smoke-z2: all ok');
