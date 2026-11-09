// Between-people smoke (42 tips, 52 anonymous Q&A, 30 Psst!) against a running app
// (tests/env.sh s3 4301 27054 4391). Groups, editions and draws are seeded in Mongo.
// Run: BASE_URL=… MAIL_URL=… MONGO_CONTAINER=… pnpm test:smoke:s3
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

process.env.BASE_URL ??= 'http://localhost:4301';
process.env.MAIL_URL ??= 'http://localhost:4391';
process.env.MONGO_CONTAINER ??= 'givto-mongo-s3';
const { as, mongo, signIn, step } = await import('./smoke-s2-client.mjs');

const id = () => randomBytes(12).toString('hex');
const codeOf = (result) => result.error?.data?.appCode;
const dataOf = (result) => {
  assert.equal(result.status, 200, JSON.stringify(result.error));
  return result.data;
};

const [olive, ann, bob, cee, dan, nina, eve] = await Promise.all(
  ['olive', 'ann', 'bob', 'cee', 'dan', 'nina', 'eve'].map(signIn)
);

// Olive organizes and manages Kid (no account). Nina is a member who sits out. Eve isn't in the group.
const member = (user, name, extra = {}) => ({
  id: id(),
  ...(user && { userId: user.id }),
  name,
  role: 'member',
  status: 'joined',
  wishlistView: { includeNewWishes: true, hiddenWishIds: [] },
  ...extra,
});
const m = { olive: member(olive, 'Olive', { role: 'organizer' }), ann: member(ann, 'Ann'), bob: member(bob, 'Bob') };
Object.assign(m, { cee: member(cee, 'Cee'), dan: member(dan, 'Dan'), nina: member(nina, 'Nina') });
m.kid = member(null, 'Kid', { managedBy: m.olive.id });
const group = { _id: id(), slug: `betw${id().slice(0, 8)}` };
const assignments = (pairs) => Object.fromEntries(pairs.map(([santa, giftee]) => [m[santa].id, m[giftee].id]));
const edition = (number, status, people) => ({
  _id: id(),
  groupId: group._id,
  number,
  year: 2025 + number,
  title: `Secret Santa ${2025 + number}`,
  timeZone: 'Europe/Brussels',
  exchangeMode: 'inPerson',
  avoidPreviousGiftees: false,
  status,
  statusChangedAt: {},
  participants: Object.keys(m).map((key) => ({ memberId: m[key].id, participates: people.includes(key), status: 'joined' })),
  reveal: { enabled: false },
});
// Edition 1 starts open (no draw yet). Edition 2: Olive is Kid's Santa. Edition 3: open.
const e1 = edition(1, 'open', ['olive', 'ann', 'bob', 'cee', 'dan', 'kid']);
const e2 = { ...edition(2, 'drawn', ['olive', 'kid', 'ann', 'bob']), draw: { assignments: assignments([['olive', 'kid'], ['kid', 'bob'], ['bob', 'ann'], ['ann', 'olive']]), history: [] } };
const e3 = edition(3, 'open', ['olive', 'ann', 'bob']);
mongo(`
  const now = new Date();
  const withDates = (doc) => ({ ...doc, createdAt: now, updatedAt: now });
  db.groups.insertOne(withDates({ ...${JSON.stringify(group)}, name: 'Family', locale: 'en', defaults: { timeZone: 'Europe/Brussels', exchangeMode: 'inPerson' }, createdBy: '${olive.id}', members: ${JSON.stringify(Object.values(m))}, exclusions: [], households: [] }));
  const editions = ${JSON.stringify([e1, e2, e3])};
  db.editions.insertMany(editions.map((e) => withDates({ ...e, participants: e.participants.map((p) => ({ ...p, addedAt: now })), ...(e.draw && { draw: { ...e.draw, drawnAt: now } }) })));
`);
const E1 = { groupSlug: group.slug, editionNumber: 1 };
const E2 = { groupSlug: group.slug, editionNumber: 2 };
const E3 = { groupSlug: group.slug, editionNumber: 3 };

/** Every response Ann (the subject) gets, as [path, json], for the leak checks. */
const annResponses = [];
const annQueries = async () => {
  for (const [path, input] of [['tip.authored', E1], ['tip.forGiftee', E1], ['question.forMe', E1], ['question.asked', E1], ['nudge.forMe', E1], ['nudge.status', E1], ['claim.gifteeWishlist', E1]]) {
    annResponses.push([path, JSON.stringify(dataOf(await as(ann).query(path, input)))]);
  }
};
const deliverNow = (collection, field) => mongo(`db.${collection}.updateMany({ editionId: '${e1._id}' }, { $set: { ${field}: new Date(Date.now() - 1000) } })`);

let ceeTip, bobTip, kidTip;
await step('tips before the draw: anyone about anyone in the draw but themselves', async () => {
  const authored = dataOf(await as(cee).query('tip.authored', E1));
  assert.equal(authored.canWrite, true);
  assert.deepEqual(authored.people.map((p) => p.name).sort(), ['Ann', 'Bob', 'Dan', 'Kid', 'Olive']);
  ceeTip = dataOf(await as(cee).mutate('tip.create', { ...E1, aboutMemberId: m.ann.id, text: 'Ann collects Moomin mugs' }));
  assert.deepEqual(Object.keys(ceeTip).sort(), ['aboutMemberId', 'aboutName', 'anonymous', 'id', 'text', 'updatedAt']);
  assert.equal(ceeTip.anonymous, false, 'named by default');
  bobTip = dataOf(await as(bob).mutate('tip.create', { ...E1, aboutMemberId: m.ann.id, text: 'Size M, loves green', anonymous: true }));
  kidTip = dataOf(await as(cee).mutate('tip.create', { ...E1, aboutMemberId: m.kid.id, text: 'Kid is into dinosaurs' }));
  assert.equal(codeOf(await as(cee).mutate('tip.create', { ...E1, aboutMemberId: m.cee.id, text: 'Me!' })), 'NOT_FOUND', 'not about yourself');
  assert.equal(codeOf(await as(cee).mutate('tip.create', { ...E1, aboutMemberId: m.nina.id, text: 'x' })), 'NOT_FOUND', 'not in the draw');
  assert.equal(codeOf(await as(cee).mutate('tip.create', { ...E1, aboutMemberId: m.ann.id, text: ' ' })), 'INVALID_INPUT');
  assert.equal(codeOf(await as(eve).mutate('tip.create', { ...E1, aboutMemberId: m.ann.id, text: 'x' })), 'GROUP_NOT_FOUND');
  assert.equal(dataOf(await as(dan).query('tip.forGiftee', E1)), null, 'nobody is a Santa yet');
  assert.equal(codeOf(await as(dan).mutate('question.ask', { ...E1, text: 'Size?' })), 'NOT_DRAWN');
  await annQueries();
});

// The draw: Dan → Ann → Bob → Kid → Olive → Cee → Dan.
mongo(`db.editions.updateOne({ _id: '${e1._id}' }, { $set: { status: 'drawn', draw: { assignments: ${JSON.stringify(assignments([['dan', 'ann'], ['ann', 'bob'], ['bob', 'kid'], ['kid', 'olive'], ['olive', 'cee'], ['cee', 'dan']]))}, drawnAt: new Date(), history: [] } } })`);

let danView;
await step("a tip written before the draw reaches whoever drew Ann; anonymous shows no author", async () => {
  danView = dataOf(await as(dan).query('tip.forGiftee', E1));
  assert.equal(danView.giftee.name, 'Ann');
  assert.deepEqual(danView.tips.map((t) => [t.text, t.author?.name ?? null, t.mine, t.used]), [
    ['Ann collects Moomin mugs', 'Cee', false, false],
    ['Size M, loves green', null, false, false],
  ]);
  const text = JSON.stringify(danView);
  for (const secret of [m.bob.id, m.cee.id, 'Bob', 'authorMemberId']) assert.ok(!text.includes(secret), secret);
});

await step("Ann's own responses contain no tip data", async () => {
  await annQueries();
  for (const [path, text] of annResponses) {
    for (const secret of [ceeTip.id, bobTip.id, 'Moomin', 'Size M', 'authorMemberId', 'aboutMemberId']) assert.ok(!text.includes(secret), `${secret} in ${path}: ${text}`);
  }
});

await step("B (not Ann's Santa) and the organizer never see tips about Ann; Kid's tips go to Kid's Santa, not the manager", async () => {
  const bobView = dataOf(await as(bob).query('tip.forGiftee', E1));
  assert.equal(bobView.giftee.name, 'Kid');
  assert.deepEqual(bobView.tips.map((t) => t.text), ['Kid is into dinosaurs']);
  assert.equal(codeOf(await as(bob).mutate('tip.setUsed', { ...E1, tipId: ceeTip.id, used: true })), 'NOT_FOUND');
  const oliveResponses = [
    await as(olive).query('tip.authored', E1),
    await as(olive).query('tip.forGiftee', E1),
    await as(olive).query('tip.forGiftee', { ...E1, asMemberId: m.kid.id }),
    await as(olive).query('tip.authored', E2),
    await as(olive).query('tip.forGiftee', E2),
  ];
  assert.equal(oliveResponses[1].data.giftee.name, 'Cee');
  assert.equal(oliveResponses[2].data, null, "Kid drew Olive: acting for Kid shows her nothing about herself");
  for (const response of oliveResponses) {
    const text = JSON.stringify(dataOf(response));
    for (const secret of [ceeTip.id, bobTip.id, kidTip.id, 'Moomin', 'Size M', 'dinosaurs']) assert.ok(!text.includes(secret), secret);
  }
  assert.equal(codeOf(await as(olive).mutate('tip.setUsed', { ...E1, asMemberId: m.kid.id, tipId: kidTip.id, used: true })), 'NOT_SANTA');
  assert.equal(codeOf(await as(olive).query('tip.forGiftee', { ...E1, asMemberId: m.ann.id })), 'FORBIDDEN', 'not managed by Olive');
});

await step("the author edits and deletes their tip, never learns who the Santa is or whether it was used", async () => {
  const before = dataOf(await as(cee).query('tip.authored', E1));
  dataOf(await as(dan).mutate('tip.setUsed', { ...E1, tipId: ceeTip.id, used: true }));
  assert.deepEqual(dataOf(await as(cee).query('tip.authored', E1)), before, 'no read receipt');
  assert.equal(dataOf(await as(dan).query('tip.forGiftee', E1)).tips[0].used, true);
  const text = JSON.stringify(before);
  for (const secret of ['used', 'santa', 'Santa']) assert.ok(!text.includes(secret), secret);
  const updated = dataOf(await as(cee).mutate('tip.update', { ...E1, tipId: ceeTip.id, text: 'Moomin mugs, not the plates', anonymous: true }));
  assert.equal(updated.anonymous, true);
  const tip = dataOf(await as(dan).query('tip.forGiftee', E1)).tips[0];
  assert.deepEqual([tip.text, tip.author], ['Moomin mugs, not the plates', null]);
  assert.equal(codeOf(await as(dan).mutate('tip.update', { ...E1, tipId: ceeTip.id, text: 'hijack' })), 'NOT_FOUND');
  assert.equal(codeOf(await as(dan).mutate('tip.delete', { ...E1, tipId: ceeTip.id })), 'NOT_FOUND');
  dataOf(await as(bob).mutate('tip.delete', { ...E1, tipId: bobTip.id }));
  assert.equal(dataOf(await as(dan).query('tip.forGiftee', E1)).tips.length, 1);
});

let question;
await step("Q&A: the giftee sees the question only at the delivery time, with no asker identity", async () => {
  question = dataOf(await as(dan).mutate('question.ask', { ...E1, text: 'What size are your feet?' }));
  const stored = JSON.parse(mongo(`JSON.stringify(db.questions.findOne({ _id: '${question.id}' }))`));
  const notifyAfter = new Date(stored.notifyAfter);
  assert.ok(notifyAfter - new Date(stored.createdAt) >= 3600_000, 'at least an hour later');
  assert.equal(new Intl.DateTimeFormat('en', { timeZone: 'Europe/Brussels', hour: 'numeric', hourCycle: 'h23' }).format(notifyAfter), '18');
  assert.deepEqual(dataOf(await as(ann).query('question.forMe', E1)), [], 'not delivered yet');
  assert.equal(codeOf(await as(ann).mutate('question.answer', { ...E1, questionId: question.id, text: 'Early' })), 'NOT_FOUND');
  deliverNow('questions', 'notifyAfter');
  const forAnn = dataOf(await as(ann).query('question.forMe', E1));
  assert.deepEqual(forAnn.map((q) => [q.text, q.forName, q.answer]), [['What size are your feet?', null, null]]);
  assert.notEqual(forAnn[0].askedAt.getTime(), new Date(stored.createdAt).getTime(), 'the real ask time stays hidden');
  annResponses.push(['question.forMe', JSON.stringify(forAnn)]);
});

await step('Q&A: the answer reaches only the Santa; answered once; the organizer reads nothing', async () => {
  dataOf(await as(ann).mutate('question.answer', { ...E1, questionId: question.id, text: 'Size 39' }));
  assert.equal(codeOf(await as(ann).mutate('question.answer', { ...E1, questionId: question.id, text: 'Again' })), 'NOT_FOUND');
  assert.equal(codeOf(await as(bob).mutate('question.answer', { ...E1, questionId: question.id, text: 'Me' })), 'NOT_FOUND');
  const asked = dataOf(await as(dan).query('question.asked', E1));
  assert.deepEqual(asked.questions.map((q) => [q.text, q.answer.text]), [['What size are your feet?', 'Size 39']]);
  for (const user of [olive, bob, cee]) {
    for (const path of ['question.forMe', 'question.asked']) {
      const text = JSON.stringify(dataOf(await as(user).query(path, E1)));
      assert.ok(!text.includes('feet') && !text.includes('Size 39'), `${path} leaks to another member`);
    }
  }
});

await step("questions to a managed member go to their manager, without the asker", async () => {
  dataOf(await as(bob).mutate('question.ask', { ...E1, text: 'Which dinosaur?' }));
  deliverNow('questions', 'notifyAfter');
  const forOlive = dataOf(await as(olive).query('question.forMe', E1));
  assert.deepEqual(forOlive.map((q) => [q.text, q.forName]), [['Which dinosaur?', 'Kid']]);
  assert.ok(!JSON.stringify(forOlive).includes(m.bob.id) && !JSON.stringify(forOlive).includes('Bob'));
  dataOf(await as(olive).mutate('question.answer', { ...E1, questionId: forOlive[0].id, text: 'T. rex' }));
  assert.equal(dataOf(await as(bob).query('question.asked', E1)).questions[0].answer.text, 'T. rex');
});

await step("a manager who is their managed member's Santa can't ask or Psst! (no talking to yourself)", async () => {
  const asked = dataOf(await as(olive).query('question.asked', E2));
  assert.deepEqual([asked.giftee.name, asked.canAsk, asked.answersOwnQuestions], ['Kid', false, true]);
  assert.equal(codeOf(await as(olive).mutate('question.ask', { ...E2, text: 'Hi me' })), 'FORBIDDEN');
  assert.equal(codeOf(await as(olive).mutate('nudge.send', { ...E2, kind: 'emptyWishlist' })), 'FORBIDDEN');
  assert.equal(dataOf(await as(olive).query('nudge.status', E2)).canNudge, false);
  mongo(`db.questions.insertOne({ _id: '${id()}', editionId: '${e2._id}', gifteeMemberId: '${m.kid.id}', askerMemberId: '${m.olive.id}', text: 'Old thread', notifyAfter: new Date(0), createdAt: new Date(0) })`);
  assert.deepEqual(dataOf(await as(olive).query('question.forMe', E2)), [], 'a thread with herself is left out');
});

await step("Q&A: rate limited; non-Santas can't ask", async () => {
  dataOf(await as(dan).mutate('question.ask', { ...E1, text: 'Favourite colour?' }));
  dataOf(await as(dan).mutate('question.ask', { ...E1, text: 'Tea or coffee?' }));
  assert.equal(codeOf(await as(dan).mutate('question.ask', { ...E1, text: 'One more?' })), 'RATE_LIMITED');
  assert.equal(codeOf(await as(nina).mutate('question.ask', { ...E1, text: 'x' })), 'NOT_SANTA');
  assert.equal(dataOf(await as(nina).query('question.asked', E1)), null);
  assert.equal(codeOf(await as(eve).mutate('question.ask', { ...E1, text: 'x' })), 'GROUP_NOT_FOUND');
  assert.equal(codeOf(await as(olive).mutate('question.ask', { ...E1, asMemberId: m.kid.id, text: 'x' })), 'NOT_SANTA', 'Kid drew Olive');
  assert.equal(codeOf(await as(ann).mutate('question.ask', { ...E3, text: 'x' })), 'NOT_DRAWN');
});

await step('Psst!: "add wishes" only while the wishlist is empty; one per Santa per 3 days', async () => {
  const status = dataOf(await as(dan).query('nudge.status', E1));
  assert.deepEqual([status.giftee.name, status.kind, status.canNudge, status.nextAt], ['Ann', 'emptyWishlist', true, null]);
  assert.equal(codeOf(await as(dan).mutate('nudge.send', { ...E1, kind: 'moreDetails' })), 'WRONG_NUDGE_KIND');
  dataOf(await as(dan).mutate('nudge.send', { ...E1, kind: 'emptyWishlist' }));
  assert.equal(codeOf(await as(dan).mutate('nudge.send', { ...E1, kind: 'emptyWishlist' })), 'RATE_LIMITED');
  const after = dataOf(await as(dan).query('nudge.status', E1));
  assert.equal(after.canNudge, false);
  assert.ok(after.nextAt.getTime() - Date.now() > 2.9 * 24 * 3600_000);
  dataOf(await as(dan).mutate('wish.create', { title: 'Dan wants a kite' }));
  assert.equal(dataOf(await as(cee).query('nudge.status', E1)).kind, 'moreDetails', 'Dan has wishes');
  assert.equal(codeOf(await as(cee).mutate('nudge.send', { ...E1, kind: 'emptyWishlist' })), 'WRONG_NUDGE_KIND');
  dataOf(await as(cee).mutate('nudge.send', { ...E1, kind: 'moreDetails' }));
  assert.equal(codeOf(await as(nina).mutate('nudge.send', { ...E1, kind: 'emptyWishlist' })), 'NOT_SANTA');
  assert.equal(codeOf(await as(eve).mutate('nudge.send', { ...E1, kind: 'emptyWishlist' })), 'GROUP_NOT_FOUND');
});

await step('Psst!: the giftee sees it from the delivery time, anonymously; "add wishes" clears once they add one', async () => {
  assert.deepEqual(dataOf(await as(ann).query('nudge.forMe', E1)), [], 'not delivered yet');
  deliverNow('nudges', 'sendAfter');
  const forAnn = dataOf(await as(ann).query('nudge.forMe', E1));
  assert.deepEqual(forAnn.map((n) => [n.kind, n.forName]), [['emptyWishlist', null]]);
  assert.deepEqual(Object.keys(forAnn[0]).sort(), ['forName', 'id', 'kind']);
  assert.deepEqual(dataOf(await as(dan).query('nudge.forMe', E1)).map((n) => n.kind), ['moreDetails']);
  assert.deepEqual(dataOf(await as(olive).query('nudge.forMe', E1)), [], 'the organizer sees no one else’s');
  dataOf(await as(ann).mutate('wish.create', { title: 'Ann wants a mug' }));
  assert.deepEqual(dataOf(await as(ann).query('nudge.forMe', E1)), []);
});

await step("Ann's responses never name her Santa", async () => {
  await annQueries();
  // tip.authored lists everyone Ann can leave a tip about, Dan included, so it's not checked here.
  for (const [path, text] of annResponses.filter(([path]) => path !== 'tip.authored')) {
    for (const secret of [m.dan.id, 'Dan', 'askerMemberId', 'santaMemberId']) assert.ok(!text.includes(secret), `${secret} in ${path}: ${text}`);
  }
});
