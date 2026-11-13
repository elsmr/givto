// The organizer's settings (27, 28, 26, 45, 48, 33, 87): rename, dates, call link and budget, keep apart, the join
// link, removing someone after the draw, and the next edition after gift day.
import { todayIn } from '@/lib/local-date';
import type { Page } from '@playwright/test';
import { expect, ok, test, type User } from '../fixtures';
import { drawnGroup } from '../api/s6-helpers';
import { drawOf } from './draw-seed';

/** A settings group by its title (components/ui/settings-group.tsx): a section, or a details when collapsible. */
const settingsGroup = (page: Page, title: string) =>
  page.locator('section, details').filter({ has: page.getByRole('heading', { level: 2, name: title, exact: true }) });

const openGroup = async ([ann, ...others]: User[], name: string) => {
  const group = ok(
    await ann.trpc.mutate('group.create', { name, organizerName: 'Ann', timeZone: 'Europe/Brussels', giftDay: { date: '2099-12-24' }, exchangeMode: 'inPerson' })
  );
  for (const [i, person] of others.entries()) {
    ok(await person.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name: ['Bob', 'Cee', 'Dan', 'Eve'][i] }));
  }
  return group;
};

const CALL = 'https://meet.example.com/abc-defg-hij';

const fullDate = (date: string) => new Intl.DateTimeFormat('en', { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));

test('rename the group, change the dates, the call link and the budget', async ({ page, signIn, signInPage }) => {
  const people = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const group = await openGroup(people, 'Before');
  await signInPage(page, people[0]);
  await page.goto(`/g/${group.slug}/settings`);

  await test.step('rename: the Group settings start closed, and open when the link names them', async () => {
    const groupSettings = settingsGroup(page, 'Group');
    await expect(groupSettings).toBeVisible();
    await expect(groupSettings.getByLabel('Group name')).toBeHidden();
    await page.goto(`/g/${group.slug}/settings#group`);
    const nameForm = groupSettings.locator('form').filter({ has: page.getByLabel('Group name') });
    await nameForm.getByLabel('Group name').fill('After');
    await nameForm.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Saved', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to After' })).toBeVisible();
  });

  await test.step('gift day, by post with a call link, wishlist deadline and budget', async () => {
    const editionSettings = settingsGroup(page, 'Secret Santa 2099');
    await editionSettings.getByLabel("When's gift day?").fill('2099-12-20');
    await editionSettings.getByRole('button', { name: 'Time' }).click();
    await editionSettings.getByLabel('Time').fill('18:00');
    await editionSettings.getByRole('button', { name: 'Sending gifts by post?' }).click();
    await editionSettings.getByLabel('How do gifts change hands?').selectOption({ label: 'By post' });
    await editionSettings.getByLabel('Video call link').fill(CALL);
    await editionSettings.getByLabel('Wishlists ready by').fill('2099-12-01');
    await editionSettings.getByRole('button', { name: 'Budget' }).click();
    await editionSettings.getByLabel('Amount').fill('25');
    await editionSettings.getByLabel('Currency').selectOption('EUR');
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/trpc/settings.updateEdition') && res.ok()),
      editionSettings.getByRole('button', { name: 'Save' }).click(),
    ]);
  });

  await test.step('saved: the settings keep them after a reload', async () => {
    await page.reload();
    const editionSettings = settingsGroup(page, 'Secret Santa 2099');
    await expect(editionSettings.getByLabel("When's gift day?")).toHaveValue('2099-12-20');
    await expect(editionSettings.getByLabel('Time')).toHaveValue('18:00');
    await expect(editionSettings.getByLabel('Video call link')).toHaveValue(CALL);
    await expect(editionSettings.getByLabel('Wishlists ready by')).toHaveValue('2099-12-01');
    await expect(editionSettings.getByLabel('Amount')).toHaveValue('25');
  });

  await test.step('the group page shows them', async () => {
    await page.getByRole('link', { name: 'Back to After' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'After' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Gift day', exact: true })).toBeVisible();
    await expect(page.getByText('€25 budget', { exact: true })).toBeVisible();
    await expect(page.getByText(`${fullDate('2099-12-20')} · 18:00`)).toBeVisible();
    await expect(page.getByRole('link', { name: CALL })).toHaveAttribute('target', '_blank');
    await expect(page.getByText(`Wishlists ready by ${fullDate('2099-12-01')}`)).toBeVisible();
  });
});

test('keep apart: rows of people, a stuck row is named, and the draw follows them', async ({ page, signIn, signInPage, db }) => {
  const people = await Promise.all(['ann', 'bob', 'cee', 'dan'].map((name) => signIn(name)));
  const [ann, bob, cee, dan] = people;
  const group = await openGroup(people, 'Apart');
  await signInPage(page, ann);
  await page.goto(`/g/${group.slug}/settings`);
  const keepApart = settingsGroup(page, 'The draw').getByRole('group', { name: 'Keep apart' });
  const row1 = keepApart.getByRole('group', { name: 'Row 1' });
  const row2 = keepApart.getByRole('group', { name: 'Row 2' });

  await test.step('Ann and Bob in one row, Cee and Dan in another', async () => {
    await keepApart.getByRole('button', { name: 'Add a row' }).click();
    await row1.getByLabel('Add someone…').selectOption('Ann');
    await row1.getByLabel('Add someone…').selectOption('Bob');
    await expect(row1.getByRole('button', { name: 'Take Bob out' })).toBeVisible();
    await keepApart.getByRole('button', { name: 'Add a row' }).click();
    await row2.getByLabel('Add someone…').selectOption('Cee');
    await expect(row2).toContainText('Add at least two people to this row.');
    await row2.getByLabel('Add someone…').selectOption('Dan');
    await expect(keepApart.getByRole('status'), 'nothing to say while a draw is possible').toBeEmpty();
  });

  await test.step('Cee in both rows: the draw is stuck, said until Cee is taken out again', async () => {
    await row1.getByLabel('Add someone…').selectOption('Cee');
    await expect(keepApart.getByRole('status')).toContainText('Take someone out of a row.');
    await row1.getByRole('button', { name: 'Take Cee out' }).click();
    await expect(keepApart.getByRole('status')).toBeEmpty();
    await keepApart.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Saved', { exact: true })).toBeVisible();
  });

  await test.step('kept after a reload', async () => {
    await page.reload();
    await expect(row1.getByRole('button', { name: 'Take Ann out' })).toBeVisible();
    await expect(row1.getByRole('button', { name: 'Take Bob out' })).toBeVisible();
    await expect(row2.getByRole('button', { name: 'Take Cee out' })).toBeVisible();
    await expect(row2.getByRole('button', { name: 'Take Dan out' })).toBeVisible();
  });

  await test.step('the draw keeps them apart, and the rules are frozen after it', async () => {
    ok(await ann.trpc.mutate('draw.run', { groupSlug: group.slug, editionNumber: 1 }));
    const draw = await drawOf(db, group.slug, people);
    for (const [a, b] of [[ann, bob], [bob, ann], [cee, dan], [dan, cee]]) expect(draw.gifteeOf(a)).not.toBe(b);
    await page.reload();
    await expect(keepApart).toContainText("Names are drawn, so who's kept apart can't change for this edition.");
    await expect(keepApart.getByRole('button', { name: 'Save' })).toHaveCount(0);
  });
});

test('join link settings: a cap, turn the link off, make a new one', async ({ page, newPage, signIn, signInPage }) => {
  const people = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const group = await openGroup(people, 'Link');
  await signInPage(page, people[0]);
  await page.goto(`/g/${group.slug}/settings`);
  const invite = settingsGroup(page, 'People');
  const oldLink = await invite.getByLabel('Join link').inputValue();
  expect(oldLink).toContain(group.joinToken);

  await test.step('at most 5 people', async () => {
    await invite.getByText('Link settings', { exact: true }).click();
    await invite.getByLabel('Most people').fill('5');
    await invite.getByLabel('Most people').blur();
    await expect.poll(async () => ok(await people[0].trpc.query('group.get', { groupSlug: group.slug })).organizer?.joinLink?.maxMembers).toBe(5);
    await page.reload();
    await invite.getByText('Link settings', { exact: true }).click();
    await expect(invite.getByLabel('Most people')).toHaveValue('5');
  });

  await test.step('turn the link off', async () => {
    await invite.getByRole('button', { name: 'Turn off the link' }).click();
    await expect(invite.getByText('The join link is off.')).toBeVisible();
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
    const row = settingsGroup(page, 'People').getByRole('listitem').filter({ has: page.getByText(leaverName, { exact: true }) });
    await row.getByRole('button', { name: 'Remove' }).click();
    const dialog = page.getByRole('dialog', { name: `Remove ${leaverName}?` });
    await expect(dialog).toContainText(`${leaverName} leaves the group. The names are drawn already: their Santa gets someone else, everyone else keeps their giftee.`);
    await dialog.getByRole('button', { name: `Remove ${leaverName}` }).click();
    await expect(page.getByText(`${leaverName} removed`)).toBeVisible();
    await expect(settingsGroup(page, 'People').getByText(leaverName, { exact: true })).toHaveCount(0);
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
  await test.step('done: a new edition once, under the main card; guessing is gone', async () => {
    const overview = page.getByRole('tabpanel', { name: 'Overview' });
    await expect(overview.getByRole('heading', { name: 'Same again next year?' })).toHaveCount(1);
    await expect(overview.getByRole('heading', { level: 2 }).first()).not.toHaveText('Same again next year?');
    await expect(page.getByRole('heading', { name: 'Guess your Santa' })).toHaveCount(0);
  });
  const title = `Secret Santa ${todayIn('Europe/Brussels').slice(0, 4)}`;
  await test.step("start a new edition: this year's, a draft, in the settings", async () => {
    await page.getByRole('button', { name: 'Start a new edition' }).click();
    const dialog = page.getByRole('dialog', { name: 'Start a new edition?' });
    await expect(dialog.getByLabel('Name')).toHaveValue(title);
    await expect(dialog.getByText('is finished first'), 'done already').toHaveCount(0);
    await dialog.getByRole('button', { name: 'Start new edition' }).click();
    await expect(page).toHaveURL(`/g/${group.slug}/settings`);
    await expect(settingsGroup(page, title)).toBeVisible();
    await expect(settingsGroup(page, 'People')).toContainText('3 people in this edition');
  });

  await test.step('not the same as last time: on for the new edition, off at once', async () => {
    const avoidPrevious = page.getByRole('switch', { name: 'Not the same as last time' });
    await expect(avoidPrevious).toBeChecked();
    await avoidPrevious.click();
    await expect(page.getByText('Anyone can draw the same person as last time')).toBeVisible();
    await page.reload();
    await expect(avoidPrevious).not.toBeChecked();
  });

  await test.step('open it from the group page', async () => {
    await page.getByRole('link', { name: 'Back to Yearly' }).click();
    await expect(page.getByRole('link', { name: 'Secret Santa 2099' }), 'editions start collapsed').toBeHidden();
    await page.getByRole('heading', { name: 'Editions' }).click();
    await expect(page.getByRole('link', { name: title })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('link', { name: 'Secret Santa 2099' })).toBeVisible();
    await expect(page.getByRole('heading', { name: "Nothing's sent yet" })).toBeVisible();
    await page.getByRole('button', { name: 'Open this edition' }).click();
    await expect(page.getByText('Edition opened')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Get everyone in' })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Where this Secret Santa is' }).locator('[aria-current="step"]')).toContainText('Draw');
  });
});
