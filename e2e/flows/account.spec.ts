// The account page (55): name, language, theme, passkeys, postal addresses (80), export, and deleting the account with the emailed code.
import { readFile } from 'node:fs/promises';
import { ObjectId } from 'mongodb';
import { expect, mailsTo, ok, test } from '../fixtures';

/** The light theme's page colour (#FFF8EC). */
const LIGHT_PAGE = 'rgb(255, 248, 236)';

test('name, language and theme', async ({ page, newPage, signIn, signInPage }) => {
  const ann = await signIn('ann');
  await signInPage(page, ann);
  await page.goto('/account');

  await test.step('name', async () => {
    await page.getByLabel('Name', { exact: true }).fill('Annabel');
    await page.getByRole('button', { name: 'Save name' }).click();
    await expect(page.getByText('Name saved')).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Annabel');
  });

  await test.step('dark mode, kept on this device', async () => {
    const html = page.locator('html');
    // The radios are visually hidden inside their labels: click what a person sees.
    const theme = (name: string) => page.getByRole('group', { name: 'Theme' }).getByText(name, { exact: true });
    await theme('Dark').click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await expect(html).not.toHaveCSS('background-color', LIGHT_PAGE);
    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByRole('radio', { name: 'Dark' })).toBeChecked();
    await theme('Light').click();
    await expect(html).toHaveAttribute('data-theme', 'light');
    await expect(html).toHaveCSS('background-color', LIGHT_PAGE);
    await page.emulateMedia({ colorScheme: 'dark' });
    await theme('Same as my device').click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });

  await test.step('language: switched here, saved on the account', async () => {
    await page.getByLabel('Language', { exact: true }).selectOption('Nederlands');
    await expect(page).toHaveURL('/nl/account');
    await expect(page.getByRole('heading', { name: 'Profiel' })).toBeVisible();
    expect(ok(await ann.trpc.query('me.get')).locale).toBe('nl');
  });

  await test.step('another browser (English, no language cookie) opens in Dutch once signed in', async () => {
    const other = await newPage();
    await signInPage(other, ann);
    await other.goto('/account');
    await expect(other).toHaveURL('/nl/account');
    await expect(other.getByRole('heading', { name: 'Profiel' })).toBeVisible();
  });
});

test('passkeys: the list, rename, remove', async ({ page, signIn, signInPage, db }) => {
  const ann = await signIn('ann');
  await db.raw.collection('passkeys').insertOne({
    name: 'ann-laptop', publicKey: 'pk', userId: new ObjectId(ann.id), credentialID: `cred-${ann.id}`, counter: 0,
    deviceType: 'singleDevice', backedUp: false, transports: 'internal', createdAt: new Date(),
  });
  await signInPage(page, ann);
  await page.goto('/account');
  const passkeys = page.getByRole('listitem').filter({ has: page.getByRole('button', { name: /^Remove / }) });
  await expect(passkeys).toHaveCount(1);
  await expect(passkeys).toContainText('ann-laptop');

  await page.getByRole('button', { name: 'Rename: ann-laptop' }).click();
  await page.getByLabel('New name for ann-laptop').fill('Work laptop');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(passkeys).toContainText('Work laptop');

  await page.getByRole('button', { name: 'Remove Work laptop' }).click();
  await expect(page.getByText('Passkey removed')).toBeVisible();
  await expect(page.getByText('No passkeys yet.')).toBeVisible();
});

test('postal addresses: add, edit, make default, remove', async ({ page, signIn, signInPage }) => {
  const ann = await signIn('ann');
  await signInPage(page, ann);
  await page.goto('/account');
  const addresses = page.getByRole('listitem').filter({ has: page.locator('address') });
  const add = async (street: string, postalCode: string, city: string) => {
    await page.getByRole('button', { name: 'Add an address' }).click();
    await page.getByLabel('Street and number').fill(street);
    await page.getByLabel('Postal code').fill(postalCode);
    await page.getByLabel('City').fill(city);
    await page.getByLabel('Country').selectOption({ label: 'Belgium' });
    await page.getByRole('button', { name: 'Save address' }).click();
    await expect(page.getByText('Address saved').first()).toBeVisible();
  };

  await add('Annstraat 1', '1000', 'Brussel');
  await add('Werkplein 1', '2000', 'Antwerpen');
  await expect(addresses).toHaveCount(2);
  await expect(addresses.filter({ hasText: 'Annstraat 1' })).toContainText('Default');

  await page.getByRole('button', { name: 'Edit: Werkplein 1, 2000 Antwerpen' }).click();
  await page.getByLabel('Street and number').fill('Werkplein 2');
  await page.getByRole('button', { name: 'Save address' }).click();
  await expect(addresses.filter({ hasText: 'Werkplein 2' })).toHaveCount(1);

  await page.getByRole('button', { name: 'Make default: Werkplein 2, 2000 Antwerpen' }).click();
  await expect(addresses.filter({ hasText: 'Werkplein 2' })).toContainText('Default');
  await page.getByRole('button', { name: 'Remove: Werkplein 2, 2000 Antwerpen' }).click();
  await expect(addresses).toHaveCount(1);
  await expect(addresses).toContainText('Default');
  expect(ok(await ann.trpc.query('account.addresses')).addresses.map((a) => a.lines[0])).toEqual(['Annstraat 1']);
});

test('export: a JSON file with my data and nobody else’s', async ({ page, signIn, signInPage }) => {
  const [ann, bob] = await Promise.all([signIn('ann'), signIn('bob')]);
  const group = ok(await ann.trpc.mutate('group.create', { name: 'Export', organizerName: 'Ann', timeZone: 'Europe/Brussels', exchangeMode: 'inPerson' }));
  ok(await bob.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name: 'Bob' }));
  ok(await ann.trpc.mutate('wish.create', { title: 'Ann wish' }));
  ok(await bob.trpc.mutate('wish.create', { title: 'Bob wish' }));
  await signInPage(page, ann);
  await page.goto('/account');

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download my data' }).click()]);
  expect(download.suggestedFilename()).toBe('givto-data.json');
  const text = await readFile(await download.path(), 'utf8');
  const data = JSON.parse(text);
  expect(data.account.email).toBe(ann.email);
  expect(data.wishes.map((wish: { title: string }) => wish.title)).toEqual(['Ann wish']);
  expect(data.groups).toHaveLength(1);
  for (const needle of [bob.email, 'Bob wish', bob.id]) expect(text, `export leaks ${needle}`).not.toContain(needle);
});

test('delete the account with the emailed code', async ({ page, signIn, signInPage, secrets }) => {
  const ann = await signIn('ann');
  await signInPage(page, ann);
  await page.goto('/account');
  const before = (await mailsTo(ann.email)).length;

  await page.getByRole('button', { name: 'Delete my account' }).click();
  const dialog = page.getByRole('dialog', { name: 'Delete your account?' });
  await dialog.getByRole('button', { name: 'Email me a code' }).click();
  await expect(dialog.getByText(`We sent a 6-digit code to ${ann.email}.`)).toBeVisible();
  await expect.poll(async () => (await mailsTo(ann.email)).length).toBe(before + 1);
  const code = (await mailsTo(ann.email)).at(-1)!.text.match(/\b(\d{6})\b/)![1];
  secrets.push(code);

  await dialog.getByLabel('6-digit code').fill(String((Number(code) + 1) % 1e6).padStart(6, '0'));
  await dialog.getByRole('button', { name: 'Delete my account for good' }).click();
  await expect(dialog.getByText("That code isn't right or has expired.")).toBeVisible();

  await dialog.getByLabel('6-digit code').fill(code);
  await dialog.getByRole('button', { name: 'Delete my account for good' }).click();
  await expect(page).toHaveURL('/');
  expect((await ann.trpc.query('me.get')).status).toBe(401);
  await page.goto('/account');
  await expect(page).toHaveURL('/auth/sign-in?redirect=%2Faccount');
});
