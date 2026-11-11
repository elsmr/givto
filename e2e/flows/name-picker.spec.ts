// Name picker (70): /pick for anyone, and the same picker from a group's ⋯ menu.
import type { Locator, Page } from '@playwright/test';
import { expect, ok, test } from '../fixtures';

const picked = (page: Page | Locator) => page.getByRole('list', { name: 'Picked' }).getByRole('listitem');

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('/pick: one at a time, several at once, until nobody is left, then start over', async ({ page }) => {
    const names = ['Ann', 'Bob', 'Cee', 'Dee', 'Eve'];
    await page.goto('/pick');
    await expect(page.getByRole('heading', { level: 1, name: 'Random name picker' })).toBeVisible();
    await page.getByRole('textbox', { name: 'Names' }).fill('Ann, Bob\nCee\n\nDee, Ann\nEve');
    await expect(page.getByText('5 of 5 left')).toBeVisible();

    await page.getByRole('button', { name: 'Pick' }).click();
    await expect(page.getByRole('status')).toHaveText(/^Picked: (Ann|Bob|Cee|Dee|Eve)$/);
    await expect(picked(page)).toHaveCount(1);
    await expect(page.getByText('4 of 5 left')).toBeVisible();

    await page.getByLabel('How many').fill('3');
    await page.getByRole('switch', { name: 'Spin for each name' }).click();
    await page.getByRole('button', { name: 'Pick' }).click();
    await expect(picked(page)).toHaveCount(4);
    await expect(page.getByRole('status')).toHaveText(/^Picked: \w+, \w+, and \w+$/);

    await page.getByRole('button', { name: 'Pick' }).click();
    await expect(picked(page)).toHaveCount(5);
    expect((await picked(page).allInnerTexts()).toSorted()).toEqual(names);
    await expect(page.getByText('0 of 5 left')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pick' })).toBeDisabled();

    await page.getByRole('button', { name: 'Start over' }).click();
    await expect(picked(page)).toHaveCount(0);
    await expect(page.getByText('5 of 5 left')).toBeVisible();
  });

  test('/nl/pick is Dutch and indexable', async ({ page }) => {
    await page.goto('/nl/pick');
    await expect(page.locator('html')).toHaveAttribute('lang', 'nl');
    await expect(page.getByRole('heading', { level: 1, name: 'Willekeurige namenkiezer' })).toBeVisible();
    await page.getByRole('textbox', { name: 'Namen' }).fill('Ann, Bob');
    await page.getByRole('button', { name: 'Kies' }).click();
    await expect(page.getByRole('status')).toHaveText(/^Gekozen: (Ann|Bob)$/);
  });

  test('a member picks from the ⋯ menu, starting with the people who joined', async ({ page, signIn, signInPage }) => {
    const [ann, bob, cee] = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
    const group = ok(await ann.trpc.mutate('group.create', { name: 'Picker', organizerName: 'Ann', timeZone: 'Europe/Brussels', exchangeMode: 'inPerson' }));
    for (const [person, name] of [[bob, 'Bob'], [cee, 'Cee']] as const) {
      ok(await person.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name }));
    }
    await signInPage(page, bob);
    await page.goto(`/g/${group.slug}`);
    await page.getByRole('button', { name: 'More' }).click();
    await expect(page.getByRole('menuitem')).toHaveText(['Pick a name']);
    await page.getByRole('menuitem', { name: 'Pick a name' }).click();
    const dialog = page.getByRole('dialog', { name: 'Pick a name' });
    await expect(dialog.getByRole('textbox', { name: 'Names' })).toHaveValue('Ann\nBob\nCee');
    await dialog.getByRole('textbox', { name: 'Names' }).fill('Ann\nBob\nCee\nDee');
    await dialog.getByLabel('How many').fill('4');
    await dialog.getByRole('switch', { name: 'Spin for each name' }).click();
    await dialog.getByRole('button', { name: 'Pick' }).click();
    await expect(picked(dialog)).toHaveCount(4);
    expect((await picked(dialog).allInnerTexts()).toSorted()).toEqual(['Ann', 'Bob', 'Cee', 'Dee']);
  });
});

test('/pick spins for each name in turn', async ({ page }) => {
  await page.goto('/pick');
  await page.getByRole('textbox', { name: 'Names' }).fill('Ann\nBob\nCee\nDee\nEve');
  await page.getByLabel('How many').fill('2');
  await expect(page.getByRole('switch', { name: 'Spin for each name' })).toBeChecked();
  await page.getByRole('button', { name: 'Pick' }).click();
  await expect(page.getByRole('button', { name: 'Pick' })).toBeDisabled();
  await expect(picked(page)).toHaveCount(1, { timeout: 10_000 });
  await expect(picked(page)).toHaveCount(2, { timeout: 10_000 });
  await expect(page.getByRole('button', { name: 'Pick' })).toBeEnabled();
});
