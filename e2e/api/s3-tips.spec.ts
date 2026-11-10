// S3 between people (tips): who may write and read tips, before and
// after the draw, and that nothing about them reaches the subject or the organizer.
import { expect, ok, test, type TrpcError } from '../fixtures';
import { seedBetween, type People } from './s3-seed';

const codeOf = (result: { error?: TrpcError }) => result.error?.data.appCode;

test('tips: before and after the draw, who sees what', async ({ signIn, db }) => {
  const names = ['olive', 'ann', 'bob', 'cee', 'dan', 'nina', 'eve'] as const;
  const people = Object.fromEntries(await Promise.all(names.map(async (name) => [name, await signIn(name)]))) as People;
  const { olive, ann, bob, cee, dan, eve } = people;
  const { m, E1, E2, drawE1, annQueries } = await seedBetween(db, people);
  /** Every response Ann (the subject) gets, as [path, json], for the leak checks. */
  const annResponses: [string, string][] = [];

  const { ceeTip, bobTip, kidTip } = await test.step('tips before the draw: anyone about anyone in the draw but themselves', async () => {
    const authored = ok(await cee.trpc.query('tip.authored', E1))!;
    expect(authored.canWrite).toBe(true);
    expect(authored.people.map((p) => p.name).sort()).toEqual(['Ann', 'Bob', 'Dan', 'Kid', 'Olive']);
    const ceeTip = ok(await cee.trpc.mutate('tip.create', { ...E1, aboutMemberId: m.ann.id, text: 'Ann collects Moomin mugs', anonymous: false }));
    expect(Object.keys(ceeTip).sort()).toEqual(['aboutMemberId', 'aboutName', 'anonymous', 'id', 'text', 'updatedAt']);
    const bobTip = ok(await bob.trpc.mutate('tip.create', { ...E1, aboutMemberId: m.ann.id, text: 'Size M, loves green', anonymous: true }));
    const kidTip = ok(await cee.trpc.mutate('tip.create', { ...E1, aboutMemberId: m.kid.id, text: 'Kid is into dinosaurs' }));
    expect(kidTip.anonymous, 'anonymous by default').toBe(true);
    expect(codeOf(await cee.trpc.mutate('tip.create', { ...E1, aboutMemberId: m.cee.id, text: 'Me!' })), 'not about yourself').toBe('NOT_FOUND');
    expect(codeOf(await cee.trpc.mutate('tip.create', { ...E1, aboutMemberId: m.nina.id, text: 'x' })), 'not in the draw').toBe('NOT_FOUND');
    expect(codeOf(await cee.trpc.mutate('tip.create', { ...E1, aboutMemberId: m.ann.id, text: ' ' }))).toBe('INVALID_INPUT');
    expect(codeOf(await eve.trpc.mutate('tip.create', { ...E1, aboutMemberId: m.ann.id, text: 'x' }))).toBe('GROUP_NOT_FOUND');
    expect(ok(await dan.trpc.query('tip.forGiftee', E1)), 'nobody is a Santa yet').toBeNull();
    expect(codeOf(await dan.trpc.mutate('question.ask', { ...E1, text: 'Size?' }))).toBe('NOT_DRAWN');
    await annQueries(annResponses);
    return { ceeTip, bobTip, kidTip };
  });

  await drawE1();

  await test.step('a tip written before the draw reaches whoever drew Ann; anonymous shows no author', async () => {
    const danView = ok(await dan.trpc.query('tip.forGiftee', E1))!;
    expect(danView.giftee.name).toBe('Ann');
    expect(danView.tips.map((t) => [t.text, t.author?.name ?? null, t.mine, t.used])).toEqual([
      ['Ann collects Moomin mugs', 'Cee', false, false],
      ['Size M, loves green', null, false, false],
    ]);
    const text = JSON.stringify(danView);
    for (const secret of [m.bob.id, m.cee.id, 'Bob', 'authorMemberId']) expect(text, secret).not.toContain(secret);
  });

  await test.step('Ann’s own responses contain no tip data', async () => {
    await annQueries(annResponses);
    for (const [path, text] of annResponses) {
      for (const secret of [ceeTip.id, bobTip.id, 'Moomin', 'Size M', 'authorMemberId', 'aboutMemberId']) {
        expect(text, `${secret} in ${path}`).not.toContain(secret);
      }
    }
  });

  await test.step('B (not Ann’s Santa) and the organizer never see tips about Ann; Kid’s tips go to Kid’s Santa, not the manager', async () => {
    const bobView = ok(await bob.trpc.query('tip.forGiftee', E1))!;
    expect(bobView.giftee.name).toBe('Kid');
    expect(bobView.tips.map((t) => t.text)).toEqual(['Kid is into dinosaurs']);
    expect(codeOf(await bob.trpc.mutate('tip.setUsed', { ...E1, tipId: ceeTip.id, used: true }))).toBe('NOT_FOUND');
    const oliveResponses = [
      await olive.trpc.query('tip.authored', E1),
      await olive.trpc.query('tip.forGiftee', E1),
      await olive.trpc.query('tip.forGiftee', { ...E1, asMemberId: m.kid.id }),
      await olive.trpc.query('tip.authored', E2),
      await olive.trpc.query('tip.forGiftee', E2),
    ];
    expect((oliveResponses[1].data as { giftee: { name: string } }).giftee.name).toBe('Cee');
    expect(oliveResponses[2].data, 'Kid drew Olive: acting for Kid shows her nothing about herself').toBeNull();
    for (const response of oliveResponses) {
      const text = JSON.stringify(ok<unknown>(response));
      for (const secret of [ceeTip.id, bobTip.id, kidTip.id, 'Moomin', 'Size M', 'dinosaurs']) expect(text, secret).not.toContain(secret);
    }
    expect(codeOf(await olive.trpc.mutate('tip.setUsed', { ...E1, asMemberId: m.kid.id, tipId: kidTip.id, used: true }))).toBe('NOT_SANTA');
    expect(codeOf(await olive.trpc.query('tip.forGiftee', { ...E1, asMemberId: m.ann.id })), 'not managed by Olive').toBe('FORBIDDEN');
  });

  await test.step('the author edits and deletes their tip, never learns who the Santa is or whether it was used', async () => {
    const before = ok(await cee.trpc.query('tip.authored', E1));
    ok(await dan.trpc.mutate('tip.setUsed', { ...E1, tipId: ceeTip.id, used: true }));
    expect(ok(await cee.trpc.query('tip.authored', E1)), 'no read receipt').toEqual(before);
    expect(ok(await dan.trpc.query('tip.forGiftee', E1))!.tips[0].used).toBe(true);
    const text = JSON.stringify(before);
    for (const secret of ['used', 'santa', 'Santa']) expect(text, secret).not.toContain(secret);
    const kept = ok(await cee.trpc.mutate('tip.update', { ...E1, tipId: ceeTip.id, text: 'Moomin mugs' }));
    expect(kept.anonymous, 'an edit without the switch keeps the tip named').toBe(false);
    const updated = ok(await cee.trpc.mutate('tip.update', { ...E1, tipId: ceeTip.id, text: 'Moomin mugs, not the plates', anonymous: true }));
    expect(updated.anonymous).toBe(true);
    const tip = ok(await dan.trpc.query('tip.forGiftee', E1))!.tips[0];
    expect([tip.text, tip.author]).toEqual(['Moomin mugs, not the plates', null]);
    expect(codeOf(await dan.trpc.mutate('tip.update', { ...E1, tipId: ceeTip.id, text: 'hijack' }))).toBe('NOT_FOUND');
    expect(codeOf(await dan.trpc.mutate('tip.delete', { ...E1, tipId: ceeTip.id }))).toBe('NOT_FOUND');
    ok(await bob.trpc.mutate('tip.delete', { ...E1, tipId: bobTip.id }));
    expect(ok(await dan.trpc.query('tip.forGiftee', E1))!.tips).toHaveLength(1);
  });

  // Covers Ann's tip responses; s3-questions.spec.ts checks her Q&A and Psst! responses.
  await test.step('Ann’s responses never name her Santa', async () => {
    // tip.authored lists everyone Ann can leave a tip about, Dan included, so it's not checked here.
    for (const [path, text] of annResponses.filter(([path]) => path !== 'tip.authored')) {
      for (const secret of [m.dan.id, 'Dan', 'askerMemberId', 'santaMemberId']) expect(text, `${secret} in ${path}`).not.toContain(secret);
    }
  });
});
