import { expect, latestMail, readSignInMail, test, uniqueEmail } from '../fixtures';

test('signed out: create a Secret Santa with the emailed code and land on the share screen', async ({ page, secrets }) => {
  const email = uniqueEmail('create');
  secrets.push(email);
  await page.goto('/new');
  await page.getByLabel("What's your Secret Santa called?").fill('Cousins');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel('Your name').fill('Ann');
  await page.getByLabel('Your email').fill(email);
  await page.getByRole('button', { name: 'Send me a code' }).click();
  const { code, token } = readSignInMail(await latestMail(email));
  secrets.push(code, token);
  await page.getByLabel('Code').fill(code);
  await page.getByRole('button', { name: 'Create Secret Santa' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Cousins is ready!' })).toBeVisible();
});
