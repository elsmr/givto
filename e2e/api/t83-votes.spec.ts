// Live voting (83): at a turn, after unwrapping and before their Santa, everyone else in the draw votes who it
// was from. Votes only while the presenter has it open; nothing (no count, no voter) comes out before it closes,
// then only counts per name. The Santa votes like anyone. Back steps through it; cleanup like guesses.
import { newId } from '@/lib/server/db';
import { expect, mailsTo, ok, test, type TestDb, type User } from '../fixtures';
import { code, drawnGroup, editionOf } from './s6-helpers';

type Input = { groupSlug: string; editionNumber: number };
type Action = 'start' | 'spin' | 'vote' | 'tally' | 'santa' | 'more' | 'last' | 'back';

/** Ann → Bob → Cee → Dan → Ann, unwrapping in that order: Ann goes first and Dan is her Santa. */
const fixDraw = async (db: TestDb, slug: string, people: User[]) => {
  const group = (await db.groups.findOne({ slug }))!;
  const ids = people.map((p) => group.members.find((m) => m.userId === p.id)!.id);
  const assignments = Object.fromEntries(ids.map((id, i) => [id, ids[(i + 1) % ids.length]]));
  await db.editions.updateOne({ groupId: group._id, number: 1 }, { $set: { 'draw.assignments': assignments } });
  return ids;
};

const advance = async (ann: User, at: Input, action: Action) => {
  const view = ok(await ann.trpc.query('giftday.presenter', at));
  return ann.trpc.mutate('giftday.advance', { ...at, action, turnsTaken: view.unwrapOrder!.turnsTaken });
};

/** Everything a person can read about this edition, leaving out their own vote. */
const everything = async (user: User, at: Input, organizer: boolean) => {
  const giftDay = ok(await user.trpc.query('giftday.get', at));
  return JSON.stringify([
    ok(await user.trpc.query('group.get', { groupSlug: at.groupSlug })),
    { ...giftDay, vote: giftDay.vote && { ...giftDay.vote, mine: null } },
    organizer ? ok(await user.trpc.query('giftday.presenter', at)) : null,
    ok(await user.trpc.query('account.groups')),
  ]);
};

test('vote while open, counts only once closed; the Santa votes too; back steps through it', async ({ signIn, db }) => {
  const people = await Promise.all(['ann', 'bob', 'cee', 'dan'].map((name) => signIn(name)));
  const [ann, bob, cee, dan] = people;
  const group = await drawnGroup(people, 'Votes');
  const at = { groupSlug: group.slug, editionNumber: 1 };
  const [A, B, C, D] = await fixDraw(db, group.slug, people);
  ok(await ann.trpc.mutate('manage.startGiftDay', at));
  const { _id: editionId } = await editionOf(db, group.slug);
  await db.editions.updateOne({ _id: editionId }, { $set: { 'unwrapOrder.memberIds': [A, B, C, D] } });
  const vote = (user: User, memberId: string) => user.trpc.mutate('giftday.vote', { ...at, memberId });
  const presenter = async () => ok(await ann.trpc.query('giftday.presenter', at));
  const voteOf = async (user: User) => ok(await user.trpc.query('giftday.get', at)).vote;

  await test.step('after unwrapping, the vote comes before the Santa', async () => {
    ok(await advance(ann, at, 'start'));
    ok(await advance(ann, at, 'spin'));
    expect((await presenter()).unwrapOrder).toMatchObject({ current: { memberId: A }, santaToShow: true, voteStep: 'ready' });
    expect(code(await advance(ann, at, 'santa'))).toBe('EDITION_CHANGED');
    expect(code(await advance(ann, at, 'tally'))).toBe('EDITION_CHANGED');
    expect(code(await vote(bob, D))).toBe('VOTING_CLOSED');
    expect(await voteOf(bob)).toBeNull();
    expect(code(await bob.trpc.mutate('giftday.advance', { ...at, action: 'vote', turnsTaken: 0 }))).toBe('NOT_ORGANIZER');
  });

  await test.step('open: everyone but the unwrapper votes, never for themselves or the unwrapper', async () => {
    ok(await advance(ann, at, 'vote'));
    expect((await presenter()).unwrapOrder!.voteStep).toBe('open');
    expect(code(await advance(ann, at, 'santa'))).toBe('EDITION_CHANGED');
    expect(code(await advance(ann, at, 'last'))).toBe('EDITION_CHANGED');
    expect(await voteOf(ann)).toEqual({ memberId: A, name: 'Ann', open: true, tally: null, people: [], mine: null });
    expect(await voteOf(dan)).toEqual({
      memberId: A, name: 'Ann', open: true, tally: null, mine: null,
      people: [{ memberId: B, name: 'Bob' }, { memberId: C, name: 'Cee' }],
    });
    expect(code(await vote(ann, B)), 'the unwrapper').toBe('NOT_FOUND');
    for (const memberId of [A, B, newId()]) expect(code(await vote(bob, memberId)), memberId).toBe('NOT_FOUND');
  });

  await test.step('nobody sees a vote or a count while it is open', async () => {
    const before = await Promise.all(people.map((p) => everything(p, at, p === ann)));
    ok(await vote(bob, C));
    ok(await vote(bob, D));
    ok(await vote(cee, D));
    ok(await vote(dan, B));
    expect(await Promise.all(people.map((p) => everything(p, at, p === ann)))).toEqual(before);
    expect((await voteOf(bob))!.mine, 'my vote, changed once').toEqual({ memberId: D, name: 'Dan' });
    expect((await voteOf(dan))!.mine).toEqual({ memberId: B, name: 'Bob' });
    expect(await db.votes.countDocuments({ editionId })).toBe(3);
  });

  const tally = [{ memberId: D, name: 'Dan', votes: 2 }, { memberId: B, name: 'Bob', votes: 1 }];
  await test.step('closed: counts per name for everyone, never who voted what; no more votes', async () => {
    const closed = ok(await advance(ann, at, 'tally'));
    expect(closed.unwrapOrder!.voteStep).toBe('closed');
    expect(closed.vote).toEqual({ memberId: A, name: 'Ann', open: false, tally });
    for (const p of people) expect((await voteOf(p))!.tally).toEqual(tally);
    expect(await voteOf(cee)).toMatchObject({ open: false, people: [], mine: { memberId: D } });
    expect(code(await vote(cee, B))).toBe('VOTING_CLOSED');
    expect(code(await advance(ann, at, 'last'))).toBe('EDITION_CHANGED');
    expect(JSON.stringify(await presenter())).not.toMatch(/voter/i);
  });

  await test.step('back: tally → open (votes kept) → not open; opening again starts over', async () => {
    ok(await advance(ann, at, 'back'));
    expect(await voteOf(bob)).toMatchObject({ open: true, tally: null, mine: { memberId: D } });
    ok(await advance(ann, at, 'back'));
    expect((await presenter()).unwrapOrder).toMatchObject({ current: { memberId: A }, voteStep: 'ready', turnsTaken: 0 });
    expect(await voteOf(bob)).toBeNull();
    ok(await advance(ann, at, 'vote'));
    expect((await voteOf(bob))!.mine).toBeNull();
    ok(await vote(cee, D));
    ok(await advance(ann, at, 'tally'));
    expect((await presenter()).vote!.tally).toEqual([{ memberId: D, name: 'Dan', votes: 1 }]);
  });

  await test.step('the Santa comes out under the tally; the next turn votes afresh', async () => {
    const shown = ok(await advance(ann, at, 'santa'));
    expect(shown.unwrapOrder).toMatchObject({ santaToShow: false, voteStep: null });
    expect(shown.vote!.tally).toEqual([{ memberId: D, name: 'Dan', votes: 1 }]);
    expect(shown.guessing!.results).toEqual([expect.objectContaining({ memberId: A, santa: 'Dan' })]);
    ok(await advance(ann, at, 'back'));
    expect((await presenter()).unwrapOrder!.voteStep).toBe('closed');
    ok(await advance(ann, at, 'santa'));
    ok(await advance(ann, at, 'last'));
    ok(await advance(ann, at, 'spin'));
    expect(await presenter()).toMatchObject({ unwrapOrder: { current: { memberId: B }, voteStep: 'ready' }, vote: null });
    ok(await advance(ann, at, 'vote'));
    expect((await voteOf(ann))!.people.map((p) => p.memberId)).toEqual([C, D]);
  });

  await test.step('Guess your Santa off: no vote', async () => {
    ok(await ann.trpc.mutate('guess.setEnabled', { ...at, enabled: false }));
    expect(code(await vote(ann, C))).toBe('VOTING_CLOSED');
    expect(await presenter()).toMatchObject({ unwrapOrder: { santaToShow: false, voteStep: null }, vote: null });
    expect(await voteOf(ann)).toBeNull();
    ok(await ann.trpc.mutate('guess.setEnabled', { ...at, enabled: true }));
    ok(await vote(ann, C));
  });
});

test('removal, account deletion, re-draw drop votes; export lists mine', async ({ signIn, db }) => {
  const people = await Promise.all(['ann', 'bob', 'cee', 'dan'].map((name) => signIn(name)));
  const [ann, bob, cee, dan] = people;
  const group = await drawnGroup(people, 'Vote changes');
  const at = { groupSlug: group.slug, editionNumber: 1 };
  const { _id: editionId } = await editionOf(db, group.slug);

  await test.step('a re-draw drops them', async () => {
    await db.votes.insertOne({ _id: newId(), editionId, turnMemberId: newId(), voterMemberId: newId(), votedMemberId: newId(), createdAt: new Date() });
    ok(await ann.trpc.mutate('draw.redraw', at));
    expect(await db.votes.countDocuments({ editionId })).toBe(0);
  });

  const [A, B, C, D] = await fixDraw(db, group.slug, people);
  ok(await ann.trpc.mutate('manage.startGiftDay', at));
  await db.editions.updateOne({ _id: editionId }, { $set: { 'unwrapOrder.memberIds': [A, B, C, D] } });
  for (const action of ['start', 'spin', 'vote'] as const) ok(await advance(ann, at, action));
  ok(await bob.trpc.mutate('giftday.vote', { ...at, memberId: D }));
  ok(await cee.trpc.mutate('giftday.vote', { ...at, memberId: B }));
  ok(await dan.trpc.mutate('giftday.vote', { ...at, memberId: C }));
  const voters = async () => (await db.votes.find({ editionId }).toArray()).map((v) => v.voterMemberId).toSorted();

  await test.step('export: my votes by name', async () => {
    expect(ok(await bob.trpc.query('account.export')).votesCast).toEqual([
      { editionId, turn: 'Ann', voted: 'Dan', createdAt: expect.anything() },
    ]);
  });

  await test.step('removing Dan drops his vote and the one naming him', async () => {
    ok(await ann.trpc.mutate('settings.removePerson', { groupSlug: group.slug, memberId: D }));
    expect(await voters()).toEqual([C]);
  });

  await test.step("account deletion: Bob's vote and those naming him go", async () => {
    ok(await bob.trpc.mutate('giftday.vote', { ...at, memberId: C }));
    const before = (await mailsTo(bob.email)).filter((mail) => mail.tags.length === 0).length;
    ok(await bob.trpc.mutate('account.requestDeletion'));
    let mails = await mailsTo(bob.email);
    await expect.poll(async () => (mails = (await mailsTo(bob.email)).filter((mail) => mail.tags.length === 0)).length).toBe(before + 1);
    ok(await bob.trpc.mutate('account.delete', { code: mails.at(-1)!.text.match(/\b(\d{6})\b/)![1] }));
    expect(await voters()).toEqual([]);
  });
});
