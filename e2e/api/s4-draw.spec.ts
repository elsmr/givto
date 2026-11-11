// S4 draw & settings (the Family group): organizer-only settings, date
// and budget validation, refused and valid draws, late joiners, leaving, re-draw, the .ics
// file and the next edition. One group whose steps build on each other.
import { editionCalendarEvents, toIcs } from '@/lib/calendar';
import { expect, ok, test, type MutationPath } from '../fixtures';
import { codeOf, createGroup, editionOf, expectValidDraw, groupOf, join, memberIdOf, rulesOf } from './s4-group';

test('Family: settings, draw, changes after the draw, .ics, next edition', async ({ signIn, db }) => {
  const [ann, bob, cee, dan, eve, fay, zed] = await Promise.all(['ann', 'bob', 'cee', 'dan', 'eve', 'fay', 'zed'].map((name) => signIn(name)));
  const family = await createGroup(ann, 'Family');
  const slug = family.slug;
  for (const [person, name] of [[bob, 'Bob'], [cee, 'Cee'], [dan, 'Dan'], [eve, 'Eve']] as const) await join(person, family, name);
  const id: Record<string, string> = {};
  for (const [name, person] of Object.entries({ ann, bob, cee, dan, eve })) id[name] = await memberIdOf(db, slug, person);
  const edition1 = { groupSlug: slug, editionNumber: 1 };
  const rules = async () => rulesOf(await groupOf(db, slug));

  await test.step('settings are organizer-only; outsiders get GROUP_NOT_FOUND', async () => {
    const editionInput = { ...edition1, title: 'Hacked', exchangeMode: 'inPerson' };
    for (const [path, input] of [
      ['settings.rename', { groupSlug: slug, name: 'Hacked' }],
      ['settings.updateEdition', editionInput],
      ['settings.setAvoidPrevious', { ...edition1, enabled: false }],
      ['settings.setParticipants', { ...edition1, memberIds: [id.bob] }],
      ['settings.removePerson', { groupSlug: slug, memberId: id.cee }],
      ['settings.deleteGroup', { groupSlug: slug }],
      ['draw.run', edition1],
      ['draw.redraw', edition1],
      ['edition.startNext', { groupSlug: slug }],
    ] as [MutationPath, object][]) {
      expect(codeOf(await bob.trpc.mutate(path, input as never)), path).toBe('NOT_ORGANIZER');
      expect(codeOf(await zed.trpc.mutate(path, input as never)), path).toBe('GROUP_NOT_FOUND');
    }
    expect((await groupOf(db, slug)).name).toBe('Family');
    ok(await ann.trpc.mutate('settings.rename', { groupSlug: slug, name: 'The Family' }));
    expect((await groupOf(db, slug)).name).toBe('The Family');
  });

  await test.step('edition dates and budget are validated server-side', async () => {
    const base = { ...edition1, title: 'Secret Santa 2099', exchangeMode: 'byPost', giftDay: { date: '2099-12-24' } } as const;
    expect(codeOf(await ann.trpc.mutate('settings.updateEdition', { ...base, giftDay: { date: '2001-12-24' } }))).toBe('DATE_IN_PAST');
    expect(codeOf(await ann.trpc.mutate('settings.updateEdition', { ...base, drawOn: '2001-12-01' }))).toBe('DATE_IN_PAST');
    expect(codeOf(await ann.trpc.mutate('settings.updateEdition', { ...base, drawOn: '2099-12-24' }))).toBe('DATES_OUT_OF_ORDER');
    const late = await ann.trpc.mutate('settings.updateEdition', { ...base, wishlistBy: '2099-12-25' });
    expect(codeOf(late)).toBe('INVALID_INPUT');
    expect(late.error?.data.issues?.some((issue) => issue.message === 'dates_out_of_order')).toBe(true);
    const range = await ann.trpc.mutate('settings.updateEdition', { ...base, budget: { currency: 'EUR', amount: 3000, maxAmount: 2000 } });
    expect(codeOf(range)).toBe('INVALID_INPUT');
    expect(codeOf(await ann.trpc.mutate('settings.updateEdition', { ...base, budget: { currency: 'EUR', amount: -1 } }))).toBe('INVALID_INPUT');
    const before = await editionOf(db, slug, 1);
    ok(
      await ann.trpc.mutate('settings.updateEdition', {
        ...base,
        giftDay: { date: '2099-12-24', time: '18:00', place: undefined },
        wishlistBy: '2099-12-10',
        postBy: '2099-12-19',
        budget: { currency: 'EUR', amount: 2000, maxAmount: undefined },
        notes: 'Something handmade.\nNo socks.',
      })
    );
    const after = await editionOf(db, slug, 1);
    expect(after.giftDay).toEqual({ date: '2099-12-24', time: '18:00' });
    expect(after.budget).toEqual({ currency: 'EUR', amount: 2000 });
    expect(after.calendarSequence).toBe((before.calendarSequence ?? 0) + 1);
    const nulls = [{ 'giftDay.place': { $type: 'null' } }, { 'budget.maxAmount': { $type: 'null' } }, { drawAt: { $type: 'null' } }];
    expect(await db.editions.countDocuments({ _id: after._id, $or: nulls as never })).toBe(0);
  });

  await test.step('too few people or impossible rules: the draw is refused, naming who is stuck', async () => {
    ok(await ann.trpc.mutate('settings.setParticipants', { ...edition1, memberIds: [id.ann, id.bob] }));
    expect(codeOf(await ann.trpc.mutate('draw.run', edition1))).toBe('TOO_FEW_PEOPLE');
    // Below the minimum the keep-apart check is skipped, so an impossible household can be saved…
    ok(await ann.trpc.mutate('group.setKeepApart', { groupSlug: slug, households: [[id.ann, id.bob, id.cee]] }));
    ok(await ann.trpc.mutate('settings.setParticipants', { ...edition1, memberIds: Object.values(id) }));
    const refused = await ann.trpc.mutate('draw.run', edition1);
    expect(codeOf(refused)).toBe('DRAW_IMPOSSIBLE');
    // …and the draw names it: Ann, Bob and Cee can only give to Dan and Eve.
    const { givers, receivers } = refused.error?.data.details as { givers: string[]; receivers: string[] };
    expect(givers.length > receivers.length && givers.every((g) => [id.ann, id.bob, id.cee].includes(g)), JSON.stringify(givers)).toBe(true);
    expect(receivers.toSorted()).toEqual([id.dan, id.eve].toSorted());
    expect((await editionOf(db, slug, 1)).status).toBe('open');
    ok(await ann.trpc.mutate('group.setKeepApart', { groupSlug: slug, households: [[id.ann, id.bob], [id.cee, id.dan], [id.bob, id.cee]] }));
  });

  await test.step('draw now: everyone has a valid giftee, nobody themselves or kept apart', async () => {
    ok(await ann.trpc.mutate('draw.run', edition1));
    const edition = await editionOf(db, slug, 1);
    expect(edition.status).toBe('drawn');
    expectValidDraw(edition.draw?.assignments, Object.values(id), await rules());
    expect(codeOf(await ann.trpc.mutate('draw.run', edition1))).toBe('ALREADY_DRAWN');
    expect(codeOf(await ann.trpc.mutate('settings.setParticipants', { ...edition1, memberIds: [id.ann] }))).toBe('ALREADY_DRAWN');
  });

  await test.step('members read only their own giftee (API)', async () => {
    const { assignments } = (await editionOf(db, slug, 1)).draw!;
    const names = Object.fromEntries((await groupOf(db, slug)).members.map((m) => [m.id, m.name]));
    for (const [person, memberId] of [[ann, id.ann], [bob, id.bob], [eve, id.eve]] as const) {
      const mine = ok(await person.trpc.query('draw.mine', edition1));
      expect(mine?.giftee).toEqual({ name: names[assignments[memberId]] });
      const home = JSON.stringify(ok(await person.trpc.query('group.get', { groupSlug: slug })));
      expect(!home.includes('assignments') && !home.includes('"draw"'), 'group.get leaks the draw').toBe(true);
    }
    expect(codeOf(await zed.trpc.query('draw.mine', edition1))).toBe('GROUP_NOT_FOUND');
  });

  await test.step('late joiner is slotted in: only one Santa’s giftee changes, and they are told', async () => {
    const before = (await editionOf(db, slug, 1)).draw!.assignments;
    await join(fay, family, 'Fay');
    id.fay = await memberIdOf(db, slug, fay);
    const after = await editionOf(db, slug, 1);
    expectValidDraw(after.draw?.assignments, Object.values(id), await rules());
    const changed = Object.keys(before).filter((santa) => before[santa] !== after.draw!.assignments[santa]);
    expect(changed).toHaveLength(1);
    const [santa] = changed;
    expect(after.draw!.assignments[santa]).toBe(id.fay);
    expect(after.draw!.assignments[id.fay]).toBe(before[santa]);
    expect(after.participants.find((p) => p.memberId === santa)?.gifteeChangedAt).toBeTruthy();
    expect(after.participants.filter((p) => p.gifteeChangedAt)).toHaveLength(1);
    expect(ok(await fay.trpc.query('draw.mine', edition1))?.changedAt).toBeNull();
    const told = [ann, bob, cee, dan, eve][[id.ann, id.bob, id.cee, id.dan, id.eve].indexOf(santa)];
    expect(ok(await told.trpc.query('draw.mine', edition1))?.changedAt).toBeTruthy();
    ok(await told.trpc.mutate('draw.seenChange', edition1));
    expect(ok(await told.trpc.query('draw.mine', edition1))?.changedAt).toBeNull();
  });

  await test.step('leave and remove after the draw: everyone left keeps a valid giftee', async () => {
    ok(await cee.trpc.mutate('membership.leave', { groupSlug: slug }));
    delete id.cee;
    expectValidDraw((await editionOf(db, slug, 1)).draw?.assignments, Object.values(id), await rules());
    expect(codeOf(await cee.trpc.query('group.get', { groupSlug: slug }))).toBe('GROUP_NOT_FOUND');
    expect(codeOf(await ann.trpc.mutate('settings.removePerson', { groupSlug: slug, memberId: id.ann }))).toBe('ORGANIZER_CANNOT_LEAVE');
    ok(await ann.trpc.mutate('settings.removePerson', { groupSlug: slug, memberId: id.dan }));
    delete id.dan;
    expectValidDraw((await editionOf(db, slug, 1)).draw?.assignments, Object.values(id), await rules());
    expect((await groupOf(db, slug)).members.find((m) => m.userId === dan.id)?.status).toBe('removed');
  });

  await test.step('re-draw keeps a valid draw and the old one in history', async () => {
    ok(await ann.trpc.mutate('draw.redraw', edition1));
    const { draw } = await editionOf(db, slug, 1);
    expectValidDraw(draw?.assignments, Object.values(id), await rules());
    expect(draw?.history).toHaveLength(1);
  });

  await test.step('.ics is valid: stable UID, SEQUENCE bumps when gift day changes', async () => {
    const texts = { giftDay: 'Gift day', postBy: 'Post your gift', description: 'https://givto.app/g/x' };
    const icsFor = async () => {
      const { edition } = ok(await bob.trpc.query('group.get', edition1));
      return toIcs(editionCalendarEvents({ groupSlug: slug, editionNumber: 1, ...edition! }, texts), new Date('2099-01-01T00:00:00Z'));
    };
    const first = await icsFor();
    const lines = first.split('\r\n');
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(lines.at(-2)).toBe('END:VCALENDAR');
    expect(lines.at(-1)).toBe('');
    expect(lines.every((line) => new TextEncoder().encode(line).length <= 75)).toBe(true);
    expect(lines.filter((line) => line === 'BEGIN:VEVENT')).toHaveLength(2);
    expect(lines, first).toContain('DTSTART:20991224T170000Z');
    expect(lines.includes('DTSTART;VALUE=DATE:20991219') && lines.includes('DTEND;VALUE=DATE:20991220'), first).toBe(true);
    const uids = (ics: string) => ics.split('\r\n').filter((line) => line.startsWith('UID:'));
    const sequence = (ics: string) => Number(ics.split('\r\n').find((line) => line.startsWith('SEQUENCE:'))!.slice(9));
    const base = { ...edition1, title: 'Secret Santa 2099', exchangeMode: 'byPost', postBy: '2099-12-19' } as const;
    ok(await ann.trpc.mutate('settings.updateEdition', { ...base, giftDay: { date: '2099-12-23' } }));
    const second = await icsFor();
    expect(uids(second)).toEqual(uids(first));
    expect(sequence(second)).toBe(sequence(first) + 1);
    expect(second).toContain('DTSTART;VALUE=DATE:20991223');
  });
  await test.step('next edition: this one finished, draft with everyone ticked, untick, open; not the same as last time, never exposed', async () => {
    expect(codeOf(await ann.trpc.mutate('edition.open', edition1))).toBe('EDITION_CHANGED');
    expect(ok(await ann.trpc.mutate('edition.startNext', { groupSlug: slug }))).toEqual({ number: 2 });
    expect((await editionOf(db, slug, 1)).status).toBe('done');
    expect(codeOf(await ann.trpc.mutate('edition.startNext', { groupSlug: slug }))).toBe('EDITION_IN_PROGRESS');
    const draft = await editionOf(db, slug, 2);
    expect(draft.status).toBe('draft');
    expect(draft.avoidPreviousGiftees).toBe(true);
    expect(draft.participants.filter((p) => p.participates).map((p) => p.memberId).toSorted()).toEqual(Object.values(id).toSorted());
    // Re-join Dan so there's someone to untick, then untick him.
    await join(dan, family, 'Dan');
    id.dan = await memberIdOf(db, slug, dan);
    const everyone = Object.values(id);
    const edition2 = { groupSlug: slug, editionNumber: 2 };
    ok(await ann.trpc.mutate('settings.setParticipants', { ...edition2, memberIds: everyone.filter((m) => m !== id.dan) }));
    expect((await editionOf(db, slug, 2)).participants.find((p) => p.memberId === id.dan)?.participates).toBe(false);
    ok(await ann.trpc.mutate('edition.open', edition2));
    ok(await ann.trpc.mutate('draw.run', edition2));
    const last = (await editionOf(db, slug, 1)).draw!.assignments;
    const avoid = Object.entries(last).map(([from, to]) => ({ from, to }));
    const inDraw = everyone.filter((m) => m !== id.dan);
    for (let i = 0; i < 5; i++) {
      if (i > 0) ok(await ann.trpc.mutate('draw.redraw', edition2));
      expectValidDraw((await editionOf(db, slug, 2)).draw?.assignments, inDraw, [...(await rules()), ...avoid]);
    }
    const home = ok(await ann.trpc.query('group.get', { ...edition2 }));
    expect(JSON.stringify(home)).not.toContain('assignments');
    expect(home.edition?.hasPreviousEdition).toBe(true);
    expect(home.editions.map((e) => e.number)).toEqual([2, 1]);
    const past = ok(await bob.trpc.query('group.get', edition1));
    expect(past.edition?.isCurrent).toBe(false);
    expect(codeOf(await bob.trpc.query('group.get', { groupSlug: slug, editionNumber: 9 }))).toBe('EDITION_NOT_FOUND');
  });
});
