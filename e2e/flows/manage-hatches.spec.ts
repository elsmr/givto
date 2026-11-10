// The organizer's Manage menu (64): every hatch through its confirm dialog, the stepper following along.
import { addDays, todayIn } from '@/lib/local-date';
import type { Page } from '@playwright/test';
import { expect, ok, test } from '../fixtures';

const currentStep = (page: Page) => page.getByRole('list', { name: 'Where this Secret Santa is' }).locator('[aria-current="step"]');

/** Manage → item → the dialog says what happens → confirm. */
const useHatch = async (page: Page, item: string, dialogTitle: string, confirm: string, fill?: (page: Page) => Promise<void>) => {
  await page.getByRole('button', { name: 'Manage' }).click();
  await page.getByRole('menuitem', { name: item }).click();
  const dialog = page.getByRole('dialog', { name: dialogTitle });
  await expect(dialog.getByRole('listitem').first()).toBeVisible();
  await fill?.(page);
  await dialog.getByRole('button', { name: confirm }).click();
  await expect(dialog).toBeHidden();
};

test('organizer: start gift day now, back to shopping, finish, reopen', async ({ page, signIn, signInPage }) => {
  const [ann, bob, cee] = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const group = ok(
    await ann.trpc.mutate('group.create', {
      name: 'Hatches', organizerName: 'Ann', timeZone: 'Europe/Brussels', giftDay: { date: '2099-12-24' }, exchangeMode: 'inPerson',
    })
  );
  for (const [person, name] of [[bob, 'Bob'], [cee, 'Cee']] as const) {
    ok(await person.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name }));
  }
  ok(await ann.trpc.mutate('draw.run', { groupSlug: group.slug, editionNumber: 1 }));
  await signInPage(page, ann);
  await page.goto(`/g/${group.slug}`);
  await expect(currentStep(page)).toContainText('Shop');

  await useHatch(page, 'Start gift day now', 'Start gift day now?', 'Start gift day');
  await expect(currentStep(page)).toContainText('Gift day');

  const newDate = addDays(todayIn('Europe/Brussels'), 7);
  await useHatch(page, 'Back to shopping', 'Back to shopping?', 'Back to shopping', (p) => p.getByLabel('New gift day').fill(newDate));
  await expect(currentStep(page)).toContainText('Shop');

  await useHatch(page, 'Start gift day now', 'Start gift day now?', 'Start gift day');
  await useHatch(page, 'Finish gift day', 'Finish gift day now?', 'Finish gift day');
  await expect(currentStep(page)).toContainText('Done');

  await useHatch(page, 'Reopen gift day', 'Reopen gift day for today?', 'Reopen gift day');
  await expect(currentStep(page)).toContainText('Gift day');
});

test('a member has no Manage menu', async ({ page, signIn, signInPage }) => {
  const [ann, bob, cee] = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const group = ok(await ann.trpc.mutate('group.create', { name: 'Members', organizerName: 'Ann', timeZone: 'Europe/Brussels', exchangeMode: 'inPerson' }));
  for (const [person, name] of [[bob, 'Bob'], [cee, 'Cee']] as const) {
    ok(await person.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name }));
  }
  ok(await ann.trpc.mutate('draw.run', { groupSlug: group.slug, editionNumber: 1 }));
  await signInPage(page, bob);
  await page.goto(`/g/${group.slug}`);
  await expect(currentStep(page)).toContainText('Shop');
  await expect(page.getByRole('button', { name: 'Manage' })).toHaveCount(0);
});

test('the draw dialog says who is not in the draw', async ({ page, signIn, signInPage }) => {
  const [ann, bob, cee, dan, eve] = await Promise.all(['ann', 'bob', 'cee', 'dan', 'eve'].map((name) => signIn(name)));
  const group = ok(await ann.trpc.mutate('group.create', { name: 'Left out', organizerName: 'Ann', timeZone: 'Europe/Brussels', exchangeMode: 'inPerson' }));
  for (const [person, name] of [[bob, 'Bob'], [cee, 'Cee']] as const) {
    ok(await person.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name }));
  }
  ok(await ann.trpc.mutate('join.updateLink', { groupSlug: group.slug, requiresApproval: true, maxMembers: null }));
  ok(await dan.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name: 'Dan' }));
  ok(await eve.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name: 'Eve' }));
  await signInPage(page, ann);
  await page.goto(`/g/${group.slug}`);
  await page.getByRole('button', { name: 'Draw names' }).click();
  await expect(page.getByRole('dialog', { name: 'Draw names now?' })).toContainText('Not in this draw: Dan and Eve.');
});

test('organizer: a new edition from the Manage menu, while shopping (renamed) and once done', async ({ page, signIn, signInPage, db }) => {
  const [ann, bob, cee] = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const year = todayIn('Europe/Brussels').slice(0, 4);
  const newEdition = async (finishes: string | null, title?: string) => {
    await page.getByRole('button', { name: 'Manage' }).click();
    await page.getByRole('menuitem', { name: 'Start a new edition' }).click();
    const dialog = page.getByRole('dialog', { name: 'Start a new edition?' });
    await expect(dialog.getByLabel('Name')).toHaveValue(`Secret Santa ${year}`);
    if (finishes) await expect(dialog).toContainText(`${finishes} is finished first`);
    else await expect(dialog.getByText('is finished first')).toHaveCount(0);
    if (title) await dialog.getByLabel('Name').fill(title);
    await dialog.getByRole('button', { name: 'Start new edition' }).click();
    await expect(page).toHaveURL(/\/settings$/);
  };
  const group = ok(
    await ann.trpc.mutate('group.create', { name: 'Again', organizerName: 'Ann', timeZone: 'Europe/Brussels', giftDay: { date: '2099-12-24' }, exchangeMode: 'inPerson' })
  );
  for (const [person, name] of [[bob, 'Bob'], [cee, 'Cee']] as const) {
    ok(await person.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name }));
  }
  ok(await ann.trpc.mutate('draw.run', { groupSlug: group.slug, editionNumber: 1 }));
  await signInPage(page, ann);

  await test.step('while shopping: this one is finished first', async () => {
    await page.goto(`/g/${group.slug}`);
    await expect(currentStep(page)).toContainText('Shop');
    await newEdition('Secret Santa 2099', 'Summer swap');
    await expect(page.getByRole('heading', { level: 2, name: 'Summer swap', exact: true })).toBeVisible();
    await page.goto(`/g/${group.slug}/1`);
    await expect(currentStep(page)).toContainText('Done');
  });

  await test.step('once done: nothing to finish', async () => {
    const { _id: groupId } = (await db.groups.findOne({ slug: group.slug }))!;
    ok(await ann.trpc.mutate('edition.open', { groupSlug: group.slug, editionNumber: 2 }));
    ok(await ann.trpc.mutate('draw.run', { groupSlug: group.slug, editionNumber: 2 }));
    await db.editions.updateOne({ groupId, number: 2 }, { $set: { status: 'done' } });
    await page.goto(`/g/${group.slug}`);
    await expect(currentStep(page)).toContainText('Done');
    await newEdition(null);
    await expect(page.getByRole('heading', { level: 2, name: `Secret Santa ${year}`, exact: true })).toBeVisible();
  });
});
