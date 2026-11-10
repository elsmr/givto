// The personal wishlist on /wishlist (38): add, edit, import, reorder by drag and by keyboard, delete.
import type { Page } from '@playwright/test';
import superjson from 'superjson';
import { expect, test, type TrpcOutput } from '../fixtures';

const wishTitles = (page: Page) => page.getByRole('region', { name: 'Your wishes' }).getByRole('heading', { level: 3 });
const wishItem = (page: Page, title: string) =>
  page.getByRole('region', { name: 'Your wishes' }).getByRole('listitem').filter({ has: page.getByRole('heading', { name: title }) });

/** Runs `action` and waits for the move it makes to be saved (the list itself updates optimistically). */
const saved = async (page: Page, action: Promise<void>) => {
  await Promise.all([page.waitForResponse((res) => res.url().includes('/api/trpc/wish.move') && res.ok()), action]);
};

const addWish = async (page: Page, title: string) => {
  await page.getByLabel('Wish', { exact: true }).fill(title);
  await page.getByRole('button', { name: 'Add wish' }).click();
  await expect(wishItem(page, title)).toBeVisible();
};

test('add, edit, reorder by drag and by keyboard, delete', async ({ page, signIn, signInPage }) => {
  await signInPage(page, await signIn('olive'));
  await page.goto('/wishlist');
  await expect(page.getByRole('heading', { name: 'Your wishlist is empty' })).toBeVisible();

  await test.step('add three wishes, one with details', async () => {
    await addWish(page, 'Wool socks');
    await addWish(page, 'Board game');
    await page.getByLabel('Wish', { exact: true }).fill('Cookbook');
    await page.getByRole('button', { name: 'More details' }).click();
    await page.getByLabel('Notes').fill('Anything vegetarian');
    await page.getByRole('button', { name: 'Add wish' }).click();
    await expect(wishItem(page, 'Cookbook')).toContainText('Anything vegetarian');
    await expect(wishTitles(page)).toHaveText(['Wool socks', 'Board game', 'Cookbook']);
    await expect(page.getByText('3 wishes')).toBeVisible();
  });

  await test.step('edit a title', async () => {
    await page.getByRole('button', { name: 'Edit “Board game”' }).click();
    const form = page.getByRole('region', { name: 'Your wishes' }).getByRole('listitem').filter({ has: page.getByRole('button', { name: 'Save' }) });
    await form.getByLabel('Wish', { exact: true }).fill('Board game for two');
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(wishTitles(page)).toHaveText(['Wool socks', 'Board game for two', 'Cookbook']);
  });

  await test.step('drag the last wish to the top', async () => {
    await saved(page, page.getByTitle('Drag to reorder “Cookbook”').dragTo(wishItem(page, 'Wool socks')));
    await expect(wishTitles(page)).toHaveText(['Cookbook', 'Wool socks', 'Board game for two']);
  });

  await test.step('move with the keyboard; focus follows the wish', async () => {
    await page.getByRole('button', { name: 'Move “Cookbook” down' }).focus();
    await saved(page, page.keyboard.press('Enter'));
    await expect(wishTitles(page)).toHaveText(['Wool socks', 'Cookbook', 'Board game for two']);
    await expect(page.getByRole('button', { name: 'Move “Cookbook” down' })).toBeFocused();
    await saved(page, page.keyboard.press('Enter'));
    await expect(wishTitles(page)).toHaveText(['Wool socks', 'Board game for two', 'Cookbook']);
    // At the bottom, focus moves to the other button.
    await expect(page.getByRole('button', { name: 'Move “Cookbook” up' })).toBeFocused();
    await saved(page, page.keyboard.press('Space'));
    await expect(wishTitles(page)).toHaveText(['Wool socks', 'Cookbook', 'Board game for two']);
  });

  await test.step('the order is saved', async () => {
    await page.reload();
    await expect(wishTitles(page)).toHaveText(['Wool socks', 'Cookbook', 'Board game for two']);
  });

  await test.step('delete', async () => {
    await page.getByRole('button', { name: 'Delete “Wool socks”' }).click();
    await expect(page.getByText('Deleted “Wool socks”')).toBeVisible();
    await expect(wishTitles(page)).toHaveText(['Cookbook', 'Board game for two']);
  });
});

test('import: a pasted link fills in the form; a blocked address leaves it for typing', async ({ page, signIn, signInPage }) => {
  await signInPage(page, await signIn('olive'));
  const imported: TrpcOutput<'import.fromUrl'> = {
    url: 'https://shop.example/products/wool-socks',
    title: 'Merino wool socks',
    description: 'Warm socks, size 42',
    price: { currency: 'EUR', amount: 1995 },
  };
  // The server fetches the pasted page itself and only from public addresses (SSRF guard, 39), so a
  // page this test serves is out of its reach. The browser gets a canned answer in the tRPC wire
  // format instead; extraction is covered by tests/import.check.mjs and api/s2-wishes.
  await page.route('**/api/trpc/import.fromUrl?*', (route) => route.fulfill({ json: [{ result: { data: superjson.serialize(imported) } }] }));
  await page.goto('/wishlist');
  const link = page.getByLabel("Got a link? Paste it and we'll fill in the rest");

  await test.step('paste a link: the form is prefilled, check and save', async () => {
    await link.fill(imported.url);
    await page.getByRole('button', { name: 'Fill in from link' }).click();
    await expect(page.getByText('We filled in what we found. Check it before you save.')).toBeVisible();
    await expect(page.getByLabel('Wish', { exact: true })).toHaveValue('Merino wool socks');
    await expect(page.getByLabel('Notes')).toHaveValue('Warm socks, size 42');
    await expect(page.getByLabel('Link', { exact: true })).toHaveValue(imported.url);
    await expect(page.getByLabel('Price', { exact: true })).toHaveValue('19.95');
    await page.getByRole('button', { name: 'Add wish' }).click();
    const wish = wishItem(page, 'Merino wool socks');
    await expect(wish).toContainText('Warm socks, size 42');
    await expect(wish.getByRole('link', { name: /Open link/ })).toHaveAttribute('href', imported.url);
  });

  await test.step('a blocked address (the real server answer): say so, type the wish yourself', async () => {
    await page.unroute('**/api/trpc/import.fromUrl?*');
    await link.fill('http://127.0.0.1/admin');
    await page.getByRole('button', { name: 'Fill in from link' }).click();
    await expect(page.getByText("That address can't be used. Try a link to a shop or web page.")).toBeVisible();
    await addWish(page, 'Typed by hand');
    await expect(wishTitles(page)).toHaveText(['Merino wool socks', 'Typed by hand']);
  });
});
