// 111: copy per game kind. A White Elephant or Conspiracy Santa says nothing of draws, Santas, Dibs! or tips, and an
// edition still titled after its kind is renamed when the kind changes.
import type { Page } from '@playwright/test';
import { expect, ok, test, type User } from '../fixtures';

const create = async (ann: User, name: string, kind: 'whiteElephant' | 'conspiracy') =>
  ok(await ann.trpc.mutate('group.create', { name, organizerName: 'Ann', timeZone: 'Europe/Brussels', giftDay: { date: '2099-12-24' }, exchangeMode: 'inPerson', kind }));

const join = async (group: { slug: string; joinToken: string }, people: [User, string][]) => {
  for (const [person, name] of people) ok(await person.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name }));
};

const noSecretSanta = /Secret Santa|Santa|draw|giftee|Dibs|tips/;

const openHatch = async (page: Page, item: string, title: string) => {
  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('menuitem', { name: item }).click();
  return page.getByRole('dialog', { name: title });
};

test('White Elephant: the create heading, the title follows the kind, the leave and gift day dialogs', async ({ page, newPage, signIn, signInPage }) => {
  const [ann, bob, cee] = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  await signInPage(page, ann);

  await test.step('create: the heading names the kind picked', async () => {
    await page.goto('/new');
    await page.getByRole('radio', { name: 'White Elephant' }).check();
    await expect(page.getByRole('heading', { level: 1, name: 'Start a White Elephant' })).toBeVisible();
  });

  await test.step('settings: switching the kind renames an edition still titled after it, not one renamed by hand', async () => {
    const draft = await create(ann, 'Office', 'whiteElephant');
    await page.goto(`/g/${draft.slug}/settings`);
    const title = page.getByLabel('Name of this edition');
    const form = page.locator('form').filter({ has: title });
    await expect(title).toHaveValue('White Elephant 2099');
    await page.getByRole('radio', { name: 'Conspiracy Santa' }).check();
    await expect(title).toHaveValue('Conspiracy Santa 2099');
    await page.getByRole('radio', { name: 'Secret Santa' }).check();
    await expect(title).toHaveValue('Secret Santa 2099');
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Secret Santa 2099' })).toBeVisible();
    await title.fill('Office party');
    await page.getByRole('radio', { name: 'White Elephant' }).check();
    await expect(title).toHaveValue('Office party');
  });

  const swap = await create(ann, 'Swap', 'whiteElephant');
  await join(swap, [[bob, 'Bob'], [cee, 'Cee']]);
  ok(await ann.trpc.mutate('draw.lockIn', { groupSlug: swap.slug, editionNumber: 1 }));

  await test.step('a member leaving: no draw, Santa or wishlist', async () => {
    const bobPage = await newPage();
    await signInPage(bobPage, bob);
    await bobPage.goto(`/g/${swap.slug}`);
    await bobPage.getByRole('tablist', { name: 'This group' }).getByRole('tab', { name: /People/ }).click();
    await bobPage.getByRole('button', { name: 'Leave the group' }).click();
    const dialog = bobPage.getByRole('dialog', { name: 'Leave Swap?' });
    await expect(dialog).toContainText("You won't see the group anymore. If it's locked in already, you sit this one out, also if you come back.");
    await expect(dialog).not.toContainText(/draw|Santa|wishlist/);
  });

  await test.step('start and finish gift day: no Dibs!, tips, Santas or wishes to tick off', async () => {
    await page.goto(`/g/${swap.slug}`);
    const start = await openHatch(page, 'Start gift day now', 'Start gift day now?');
    await expect(start).toContainText("Gift day lasts until the end of the day. Then it's done.");
    await expect(start.getByRole('list')).not.toContainText(noSecretSanta);
    await start.getByRole('button', { name: 'Start gift day' }).click();
    await expect(start).toBeHidden();
    const finish = await openHatch(page, 'Finish gift day', 'Finish gift day now?');
    await expect(finish).toContainText('Gift day is over for everyone, without waiting for tomorrow.');
    await expect(finish).toContainText('The settings close.');
    await expect(finish).not.toContainText(/tick off/);
    await expect(finish.getByRole('list')).not.toContainText(noSecretSanta);
  });
});

test('Conspiracy Santa: removing someone talks about their board, not a draw', async ({ page, signIn, signInPage }) => {
  const [ann, bob, cee] = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const plot = await create(ann, 'Plot', 'conspiracy');
  await join(plot, [[bob, 'Bob'], [cee, 'Cee']]);
  await signInPage(page, ann);
  await page.goto(`/g/${plot.slug}/settings`);
  await page.getByRole('button', { name: 'Remove Bob' }).click();
  const dialog = page.getByRole('dialog', { name: 'Remove Bob?' });
  await expect(dialog).toContainText('Bob leaves the group, and their board goes away. Their posts stay on the boards, and their wishlist stays theirs.');
  await expect(dialog).not.toContainText(/draw|Santa/);
});
