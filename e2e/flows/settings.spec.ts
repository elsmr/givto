// The organizer's settings (27, 28, 26, 45, 48, 33): rename, dates and budget, keep apart, the join
// link, removing someone after the draw, and the next edition after gift day.
import type { Page } from '@playwright/test';
import { expect, ok, test, type User } from '../fixtures';
import { drawnGroup } from '../api/s6-helpers';
import { drawOf } from './draw-seed';

/** A settings card by its title. Cards have no role; data-slot (components/ui/card.tsx) is the handle. */
const card = (page: Page, title: string) =>
  page.locator('[data-slot="card"]').filter({ has: page.getByRole('heading', { level: 2, name: title, exact: true }) });

const openGroup = async ([ann, ...others]: User[], name: string) => {
  const group = ok(
    await ann.trpc.mutate('group.create', { name, organizerName: 'Ann', timeZone: 'Europe/Brussels', giftDay: { date: '2099-12-24' }, exchangeMode: 'inPerson' })
  );
  for (const [i, person] of others.entries()) {
    ok(await person.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name: ['Bob', 'Cee', 'Dan', 'Eve'][i] }));
  }
  return group;
};

const fullDate = (date: string) => new Intl.DateTimeFormat('en', { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));

test('rename the group, change the dates and the budget', async ({ page, signIn, signInPage }) => {
  const people = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const group = await openGroup(people, 'Before');
  await signInPage(page, people[0]);
  await page.goto(`/g/${group.slug}/settings`);

  await test.step('rename', async () => {
    const groupCard = card(page, 'Group');
    await groupCard.getByLabel('Group name').fill('After');
    await groupCard.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Saved', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to After' })).toBeVisible();
  });

  await test.step('gift day, wishlist deadline and budget', async () => {
    const editionCard = card(page, 'Secret Santa 2099');
    await editionCard.getByLabel('Date', { exact: true }).fill('2099-12-20');
    await editionCard.getByLabel('Time').fill('18:00');
    await editionCard.getByLabel('Place').fill("Grandma's house");
    await editionCard.getByLabel('Wishlists ready by').fill('2099-12-01');
    await editionCard.getByLabel('Amount').fill('25');
    await editionCard.getByLabel('Currency').selectOption('EUR');
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/trpc/settings.updateEdition') && res.ok()),
      editionCard.getByRole('button', { name: 'Save' }).click(),
    ]);
  });

  await test.step('saved: the settings keep them after a reload', async () => {
    await page.reload();
    const editionCard = card(page, 'Secret Santa 2099');
    await expect(editionCard.getByLabel('Date', { exact: true })).toHaveValue('2099-12-20');
    await expect(editionCard.getByLabel('Wishlists ready by')).toHaveValue('2099-12-01');
    await expect(editionCard.getByLabel('Amount')).toHaveValue('25');
  });

  await test.step('the group page shows them', async () => {
    await page.getByRole('link', { name: 'Back to After' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'After' })).toBeVisible();
    await expect(page.getByText('Budget €25', { exact: true })).toBeVisible();
    await page.getByRole('heading', { name: 'Dates, budget and notes' }).click();
    await expect(page.getByText(`${fullDate('2099-12-20')} · 18:00 · Grandma's house`)).toBeVisible();
    await expect(page.getByText(fullDate('2099-12-01'))).toBeVisible();
  });
});

test('keep apart: a household and a pair, and the draw follows them', async ({ page, signIn, signInPage, db }) => {
  const people = await Promise.all(['ann', 'bob', 'cee', 'dan'].map((name) => signIn(name)));
  const [ann, bob, cee, dan] = people;
  const group = await openGroup(people, 'Apart');
  await signInPage(page, ann);
  await page.goto(`/g/${group.slug}/settings`);
  const keepApart = card(page, 'Keep apart');

  await test.step('Ann and Bob are a household; Cee and Dan don\'t draw each other', async () => {
    await keepApart.getByRole('button', { name: 'New household' }).click();
    await keepApart.getByLabel('Add someone…').selectOption('Ann');
    await keepApart.getByLabel('Add someone…').selectOption('Bob');
    await expect(keepApart.getByRole('button', { name: 'Take Bob out' })).toBeVisible();
    await keepApart.getByLabel('Someone…', { exact: true }).selectOption('Cee');
    await keepApart.getByLabel('…and someone').selectOption('Dan');
    await keepApart.getByRole('button', { name: 'Add' }).click();
    await expect(keepApart.getByText('Cee ↔ Dan')).toBeVisible();
    await expect(keepApart.getByRole('status')).toHaveText('A draw is possible.');
    await keepApart.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Saved', { exact: true })).toBeVisible();
  });

  await test.step('kept after a reload', async () => {
    await page.reload();
    await expect(keepApart.getByRole('button', { name: 'Take Ann out' })).toBeVisible();
    await expect(keepApart.getByRole('button', { name: 'Take Bob out' })).toBeVisible();
    await expect(keepApart.getByText('Cee ↔ Dan')).toBeVisible();
  });

  await test.step('the draw keeps them apart, and the rules are frozen after it', async () => {
    ok(await ann.trpc.mutate('draw.run', { groupSlug: group.slug, editionNumber: 1 }));
    const draw = await drawOf(db, group.slug, people);
    for (const [a, b] of [[ann, bob], [bob, ann], [cee, dan], [dan, cee]]) expect(draw.gifteeOf(a)).not.toBe(b);
    await page.reload();
    await expect(keepApart).toContainText("Names are drawn, so households and pairs can't change for this edition.");
    await expect(keepApart.getByRole('button', { name: 'Save' })).toHaveCount(0);
  });
});

test('join link settings: a cap, turn the link off, make a new one', async ({ page, newPage, signIn, signInPage }) => {
  const people = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const group = await openGroup(people, 'Link');
  await signInPage(page, people[0]);
  await page.goto(`/g/${group.slug}/settings`);
  const invite = card(page, 'Invite people');
  const oldLink = await invite.getByLabel('Join link').inputValue();
  expect(oldLink).toContain(group.joinToken);

  await test.step('at most 5 people', async () => {
    await invite.getByText('Link settings', { exact: true }).click();
    await invite.getByLabel('Most people (optional)').fill('5');
    await invite.getByLabel('Most people (optional)').blur();
    await expect.poll(async () => ok(await people[0].trpc.query('group.get', { groupSlug: group.slug })).organizer?.joinLink?.maxMembers).toBe(5);
    await page.reload();
    await invite.getByText('Link settings', { exact: true }).click();
    await expect(invite.getByLabel('Most people (optional)')).toHaveValue('5');
  });

  await test.step('turn the link off', async () => {
    await invite.getByRole('button', { name: 'Turn off the link' }).click();
    await expect(invite.getByText('The join link is turned off. Make a new link to let people join again.')).toBeVisible();
    await expect(invite.getByLabel('Join link')).toHaveCount(0);
  });

  await test.step('a new link; the old one stops working', async () => {
    await invite.getByRole('button', { name: 'Make a new link' }).click();
    await expect(invite.getByLabel('Join link')).toBeVisible();
    const newLink = await invite.getByLabel('Join link').inputValue();
    expect(newLink).not.toBe(oldLink);
    const visitor = await newPage();
    await visitor.goto(oldLink);
    await expect(visitor.getByRole('heading', { level: 1, name: "This link doesn't work anymore" })).toBeVisible();
    await visitor.goto(newLink);
    await expect(visitor.getByRole('heading', { level: 1, name: "You're invited!" })).toBeVisible();
  });
});

test('remove someone after the draw: only their Santa gets someone new', async ({ page, newPage, signIn, signInPage, db }) => {
  const people = await Promise.all(['ann', 'bob', 'cee', 'dan', 'eve'].map((name) => signIn(name)));
  const [ann] = people;
  const group = await openGroup(people, 'Slot out');
  ok(await ann.trpc.mutate('draw.run', { groupSlug: group.slug, editionNumber: 1 }));
  const before = await drawOf(db, group.slug, people);
  // Not the organizer, and not in a pair that drew each other (that takes a swap instead): five
  // people always have a cycle of three or more.
  const leaver = people.find((person) => person !== ann && before.santaOf(person) !== before.gifteeOf(person))!;
  const santa = before.santaOf(leaver);
  const leaverName = before.nameOf(leaver);

  await signInPage(page, ann);
  await page.goto(`/g/${group.slug}/settings`);
  await test.step(`remove ${leaverName}`, async () => {
    const row = card(page, 'People').getByRole('listitem').filter({ has: page.getByText(leaverName, { exact: true }) });
    await row.getByRole('button', { name: 'Remove' }).click();
    const dialog = page.getByRole('dialog', { name: `Remove ${leaverName}?` });
    await expect(dialog).toContainText(`${leaverName} leaves the group. The names are drawn already: their Santa gets someone else, everyone else keeps their giftee.`);
    await dialog.getByRole('button', { name: `Remove ${leaverName}` }).click();
    await expect(page.getByText(`${leaverName} removed`)).toBeVisible();
    await expect(card(page, 'People').getByText(leaverName, { exact: true })).toHaveCount(0);
  });

  await test.step("the leaver's Santa now has the leaver's giftee; everyone else keeps theirs", async () => {
    const { assignments } = (await db.editions.findOne({ _id: before.editionId }))!.draw!;
    const leaverId = before.memberIdOf(leaver);
    const expected = Object.fromEntries(
      Object.entries(before.assignments)
        .filter(([santaId]) => santaId !== leaverId)
        .map(([santaId, gifteeId]) => [santaId, gifteeId === leaverId ? before.assignments[leaverId] : gifteeId])
    );
    expect(assignments).toEqual(expected);
  });

  await test.step('the Santa is told their giftee changed', async () => {
    const santaPage = await newPage();
    await signInPage(santaPage, santa);
    await santaPage.goto(`/g/${group.slug}`);
    await expect(santaPage.getByText(/^Your giftee changed on .+: someone joined or left\.$/)).toBeVisible();
    await santaPage.getByRole('button', { name: "Tap to see who you're buying for" }).click();
    const name = before.nameOf(before.gifteeOf(leaver));
    await expect(santaPage.getByText("You're buying for", { exact: true }).locator('..').getByText(name, { exact: true })).toBeVisible();
  });
});

test('after gift day: same again next year, then open the new edition', async ({ page, signIn, signInPage, db }) => {
  const people = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const group = await drawnGroup(people, 'Yearly');
  const { _id: groupId } = (await db.groups.findOne({ slug: group.slug }))!;
  await signInPage(page, people[0]);
  await page.goto(`/g/${group.slug}`);
  await expect(page.getByRole('heading', { name: 'Same again next year?' }), 'not before gift day').toHaveCount(0);

  await db.editions.updateOne({ groupId, number: 1 }, { $set: { status: 'done' } });
  await page.reload();
  await test.step('start the 2100 edition: a draft, in the settings', async () => {
    await page.getByRole('button', { name: 'Start the 2100 edition' }).click();
    await expect(page).toHaveURL(`/g/${group.slug}/settings`);
    await expect(card(page, 'Secret Santa 2100')).toBeVisible();
    await expect(card(page, 'People')).toContainText('3 people in this edition');
  });

  await test.step('open it from the group page', async () => {
    await page.getByRole('link', { name: 'Back to Yearly' }).click();
    await expect(page.getByRole('link', { name: 'Secret Santa 2100' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('link', { name: 'Secret Santa 2099' })).toBeVisible();
    await expect(page.getByRole('heading', { name: "Nothing's sent yet" })).toBeVisible();
    await page.getByRole('button', { name: 'Open this edition' }).click();
    await expect(page.getByText('Edition opened')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Get everyone in' })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Where this Secret Santa is' }).locator('[aria-current="step"]')).toContainText('Draw');
  });
});
