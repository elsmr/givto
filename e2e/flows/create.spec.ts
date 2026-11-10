// Link-first create (45): name the Secret Santa, verify the organizer's email with the code from the
// mail mock, share the link; a second browser joins through it, with and without the organizer's approval.
import type { Page } from '@playwright/test';
import { expect, latestMail, readSignInMail, test, uniqueEmail } from '../fixtures';

/** Enters the code from the newest sign-in mail to `email`. */
const enterCode = async (page: Page, email: string, secrets: string[]) => {
  const { code, token } = readSignInMail(await latestMail(email));
  secrets.push(code, token);
  await page.getByLabel('Code').fill(code);
};

/** Signed out on /new → share screen; returns the join link it shows. */
const createSecretSanta = async (page: Page, name: string, email: string, secrets: string[]) => {
  secrets.push(email);
  await page.goto('/new');
  await page.getByLabel("What's your Secret Santa called?").fill(name);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel('Your name').fill('Ann');
  await page.getByLabel('Your email').fill(email);
  await page.getByRole('button', { name: 'Send me a code' }).click();
  await enterCode(page, email, secrets);
  await page.getByRole('button', { name: 'Create Secret Santa' }).click();
  await expect(page.getByRole('heading', { level: 1, name: `${name} is ready!` })).toBeVisible();
  const link = await page.getByLabel('Join link').inputValue();
  expect(link).toMatch(/\/g\/[^/]+\/join\?token=/);
  return link;
};

/** Opens the join link signed out: name + email → emailed code → Join. */
const joinWithLink = async (page: Page, link: string, name: string, email: string, secrets: string[]) => {
  secrets.push(email);
  await page.goto(link);
  await expect(page.getByRole('heading', { level: 1, name: "You're invited!" })).toBeVisible();
  await page.getByLabel('Your name').fill(name);
  await page.getByLabel('Your email').fill(email);
  await page.getByRole('button', { name: 'Send me a code' }).click();
  await enterCode(page, email, secrets);
  await page.getByRole('button', { name: 'Join' }).click();
};

test('create, copy the link, and a second person joins through it', async ({ page, newPage, secrets }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  const link = await createSecretSanta(page, 'Cousins', uniqueEmail('ann'), secrets);

  await test.step('copy the link', async () => {
    await page.getByRole('button', { name: 'Copy link' }).click();
    await expect(page.getByText('Link copied')).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(link);
    await page.getByRole('button', { name: 'Show QR code' }).click();
    await expect(page.getByRole('img', { name: 'QR code with the join link for Cousins' })).toBeVisible();
  });

  const bobPage = await newPage();
  await test.step('Bob joins with the emailed code and lands on the group', async () => {
    await joinWithLink(bobPage, link, 'Bob', uniqueEmail('bob'), secrets);
    await expect(bobPage).toHaveURL(new URL(link).pathname.replace(/\/join$/, ''));
    await expect(bobPage.getByRole('heading', { level: 1, name: 'Cousins' })).toBeVisible();
  });

  await test.step('the organizer sees Bob among the people', async () => {
    await page.getByRole('link', { name: 'Go to your Secret Santa' }).click();
    await page.getByRole('tab', { name: 'People' }).click();
    await expect(page.getByRole('tabpanel', { name: 'People' }).getByText('Bob', { exact: true })).toBeVisible();
  });
});

test('with approval on, a joiner waits until the organizer lets them in', async ({ page, newPage, secrets }) => {
  const link = await createSecretSanta(page, 'Office', uniqueEmail('ann'), secrets);
  await page.getByRole('link', { name: 'Go to your Secret Santa' }).click();
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await page.getByText('Link settings').click();
  const approval = page.getByRole('switch', { name: 'I let people in myself' });
  await approval.click();
  await expect(approval).toBeChecked();

  const bobPage = await newPage();
  await test.step('Bob asks to join', async () => {
    await joinWithLink(bobPage, link, 'Bob', uniqueEmail('bob'), secrets);
    await expect(bobPage.getByRole('heading', { level: 1, name: 'Almost there!' })).toBeVisible();
    await bobPage.getByRole('link', { name: 'Go to my groups' }).click();
    await expect(bobPage.getByRole('heading', { level: 1, name: 'Hi Bob' })).toBeVisible();
    await expect(bobPage.getByRole('heading', { name: 'No groups yet' })).toBeVisible();
  });

  await test.step('the organizer lets Bob in', async () => {
    await page.goto(new URL(link).pathname.replace(/\/join$/, ''));
    await expect(page.getByText('1 person wants to join')).toBeVisible();
    await page.getByRole('button', { name: 'Let in' }).click();
    await expect(page.getByText('1 person wants to join')).toBeHidden();
  });

  await test.step('Bob sees the group', async () => {
    await bobPage.reload();
    const upNext = bobPage.getByRole('region', { name: 'Coming up' });
    await expect(upNext.getByRole('heading', { name: 'Office' })).toBeVisible();
    await upNext.getByRole('link', { name: 'Open group' }).click();
    await expect(bobPage.getByRole('heading', { level: 1, name: 'Office' })).toBeVisible();
  });
});
