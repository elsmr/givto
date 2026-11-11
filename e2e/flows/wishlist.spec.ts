// The personal wishlist on /wishlist (38, 73, 76): add, edit, links, reorder by drag and by keyboard, archive.
import type { Locator, Page } from '@playwright/test';
import { Binary, ObjectId } from 'mongodb';
import superjson from 'superjson';
import { expect, ok, test, type TrpcOutput } from '../fixtures';

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

test('add, edit, reorder by drag and by keyboard, archive, restore, delete for good', async ({ page, signIn, signInPage }) => {
  const olive = await signIn('olive');
  await signInPage(page, olive);
  await page.goto('/wishlist');
  await expect(page.getByRole('heading', { name: 'Your wishlist is empty' })).toBeVisible();

  await test.step('add three wishes, one with a link in its notes; each new one goes on top', async () => {
    // The form turns links into link cards, so this one comes in as an older wish would.
    ok(await olive.trpc.mutate('wish.create', { title: 'Cookbook', description: 'Anything vegetarian, like https://example.com/ottolenghi.' }));
    await page.reload();
    await expect(wishItem(page, 'Cookbook')).toContainText('Anything vegetarian');
    const inNotes = wishItem(page, 'Cookbook').getByRole('link', { name: 'https://example.com/ottolenghi' });
    await expect(inNotes).toHaveAttribute('href', 'https://example.com/ottolenghi');
    await expect(inNotes).toHaveAttribute('rel', 'noopener noreferrer nofollow ugc');
    await addWish(page, 'Board game');
    await page.getByLabel('Wish', { exact: true }).fill('Wool socks');
    await page.getByLabel('Wish', { exact: true }).press('Enter');
    await expect(wishItem(page, 'Wool socks')).toBeVisible();
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
    await saved(page, wishItem(page, 'Cookbook').locator('[data-slot="drag-handle"]').dragTo(wishItem(page, 'Wool socks')));
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

  const archived = page.getByRole('group').filter({ has: page.getByRole('heading', { name: /^Archived \(/ }) });

  await test.step('archive, then undo: back in its place', async () => {
    await page.getByRole('button', { name: 'Archive “Wool socks”' }).click();
    await expect(page.getByText('Archived “Wool socks”')).toBeVisible();
    await expect(wishTitles(page)).toHaveText(['Cookbook', 'Board game for two']);
    await expect(page.getByText('2 wishes')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Archived (1)' })).toBeVisible();
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(wishTitles(page)).toHaveText(['Wool socks', 'Cookbook', 'Board game for two']);
    await expect(page.getByRole('heading', { name: /^Archived \(/ })).toHaveCount(0);
  });

  await test.step('restore from the archive: back at the end', async () => {
    await page.getByRole('button', { name: 'Archive “Wool socks”' }).click();
    await page.getByRole('heading', { name: 'Archived (1)' }).click();
    await expect(archived.getByRole('heading', { name: 'Wool socks' })).toBeVisible();
    await page.getByRole('button', { name: 'Restore “Wool socks”' }).click();
    await expect(wishTitles(page)).toHaveText(['Cookbook', 'Board game for two', 'Wool socks']);
    await expect(page.getByRole('heading', { name: /^Archived \(/ })).toHaveCount(0);
  });

  await test.step('delete for good, after a confirm', async () => {
    await page.getByRole('button', { name: 'Archive “Cookbook”' }).click();
    await page.getByRole('heading', { name: 'Archived (1)' }).click();
    await page.getByRole('button', { name: 'Delete for good: “Cookbook”' }).click();
    const dialog = page.getByRole('dialog', { name: 'Delete “Cookbook” for good?' });
    await dialog.getByRole('button', { name: 'Keep it' }).click();
    await expect(archived.getByRole('heading', { name: 'Cookbook' })).toBeVisible();
    await page.getByRole('button', { name: 'Delete for good: “Cookbook”' }).click();
    await dialog.getByRole('button', { name: 'Delete for good' }).click();
    await expect(page.getByText('Deleted “Cookbook”')).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Archived \(/ })).toHaveCount(0);
    await expect(wishTitles(page)).toHaveText(['Board game for two', 'Wool socks']);
  });
});

test('links: pasted or typed into the wish or notes become link cards; a walled shop keeps its link; remove a link', async ({ page, signIn, signInPage, db }) => {
  const olive = await signIn('olive');
  await signInPage(page, olive);
  // The imported picture: stored for Olive, as the server's import would.
  const imageId = new ObjectId();
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  await db.raw.collection('wishImages.files').insertOne({
    _id: imageId, length: png.length, chunkSize: 261120, uploadDate: new Date(), filename: 'wish-image', metadata: { ownerId: olive.id, contentType: 'image/png' },
  });
  await db.raw.collection('wishImages.chunks').insertOne({ files_id: imageId, n: 0, data: new Binary(png) });
  const socks = 'https://shop.example/products/wool-socks';
  const walled = 'https://www.zalando.nl/falke-wollen-sokken-fa112c0bt-a11.html';
  const imported: TrpcOutput<'import.fromUrl'> = {
    url: socks,
    title: 'Merino wool socks',
    description: 'Warm socks, size 42',
    price: { currency: 'EUR', amount: 1995 },
    imageId: imageId.toHexString(),
  };
  const failed = { reason: 'bot_wall', url: walled, title: 'Falke wollen sokken' };
  // The server fetches the pasted page itself and only from public addresses (SSRF guard, 39), so a
  // page this test serves is out of its reach. The browser gets canned answers in the tRPC wire
  // format instead; extraction is covered by tests/import.check.mjs and api/s2-wishes.
  await page.route('**/api/trpc/import.fromUrl?*', (route) => {
    const { url } = superjson.deserialize<{ url: string }>(route.request().postDataJSON()[0]);
    if (url === socks) return route.fulfill({ json: [{ result: { data: superjson.serialize(imported) } }] });
    const error = { message: 'IMPORT_FAILED', code: -32022, data: { code: 'UNPROCESSABLE_CONTENT', httpStatus: 422, appCode: 'IMPORT_FAILED', details: failed } };
    return route.fulfill({ status: 422, json: [{ error: superjson.serialize(error) }] });
  });
  await page.goto('/wishlist');
  const wishField = page.getByLabel('Wish', { exact: true });
  const notes = page.getByLabel('Notes');
  const paste = async (field: Locator, text: string) => {
    await field.focus();
    await page.evaluate((pasted) => {
      const data = new DataTransfer();
      data.setData('text/plain', pasted);
      document.activeElement?.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
    }, text);
  };

  await test.step('the add form is the wish and notes, nothing more', async () => {
    const form = page.locator('form').first();
    await expect(form.getByRole('textbox')).toHaveCount(2);
    await expect(form.getByRole('textbox').first()).toHaveAccessibleName('Wish');
    await expect(form.getByRole('button', { name: 'More details' })).toHaveCount(0);
  });

  await test.step('paste a link into the wish field: it is filled in from the page, with the picture', async () => {
    await paste(wishField, socks);
    await expect(page.getByRole('status').filter({ hasText: 'Link added' })).toBeAttached();
    await expect(wishField).toHaveValue('Merino wool socks');
    await expect(notes).toHaveValue('Warm socks, size 42');
    await expect(page.getByRole('img', { name: 'Picture of Merino wool socks' })).toBeVisible();
  });

  await test.step('a second link, pasted into the notes, from a shop that walls us off: kept quietly, the wish stays as it is', async () => {
    await paste(notes, walled);
    await expect(page.getByText('2 links')).toBeVisible();
    await expect(notes).toHaveValue('Warm socks, size 42');
    await expect(wishField).toHaveValue('Merino wool socks');
    await page.getByRole('button', { name: 'Add wish' }).click();
  });

  const wish = wishItem(page, 'Merino wool socks');
  await test.step('the card: picture, price, a link per shop that tells shops nothing', async () => {
    await expect(wish).toContainText('Warm socks, size 42');
    await expect(wish.getByRole('img', { name: 'Picture of Merino wool socks' })).toBeVisible();
    const shopLinks = wish.getByRole('list', { name: 'Links' }).getByRole('link');
    await expect(shopLinks).toHaveText([/^shop\.example\s*€\s?19[.,]95/, /^zalando\.nl/]);
    await expect(shopLinks.first()).toHaveAttribute('href', socks);
    await expect(shopLinks.first()).toHaveAttribute('rel', 'noopener noreferrer nofollow ugc');
    await expect(shopLinks.nth(1)).toHaveAttribute('href', walled);
  });

  await test.step('edit: remove a link; the price is under "More details"', async () => {
    await page.getByRole('button', { name: 'Edit “Merino wool socks”' }).click();
    await expect(page.getByLabel('Price', { exact: true })).toHaveValue('19.95');
    await page.getByRole('button', { name: 'Remove the link to zalando.nl' }).click();
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(wish.getByRole('list', { name: 'Links' }).getByRole('link')).toHaveCount(1);
  });

  await test.step('a link typed into the wish is taken out of the text and added on save', async () => {
    await wishField.fill(`Socks for Dad ${socks}`);
    await page.getByRole('button', { name: 'Add wish' }).click();
    await expect(wishItem(page, 'Socks for Dad').getByRole('link', { name: /^shop\.example/ })).toHaveAttribute('href', socks);
    await expect(wishField).toHaveValue('');
  });

  await test.step('a blocked address (the real server answer) stays in the notes as text', async () => {
    await page.unroute('**/api/trpc/import.fromUrl?*');
    await wishField.fill('Typed by hand');
    await notes.fill('See http://127.0.0.1/admin');
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/trpc/import.fromUrl')),
      page.getByRole('button', { name: 'Add wish' }).click(),
    ]);
    await expect(wishTitles(page)).toHaveText(['Typed by hand', 'Socks for Dad', 'Merino wool socks']);
    await expect(wishItem(page, 'Typed by hand')).toContainText('See http://127.0.0.1/admin');
    await expect(wishItem(page, 'Typed by hand').getByRole('list', { name: 'Links' })).toHaveCount(0);
  });
});
