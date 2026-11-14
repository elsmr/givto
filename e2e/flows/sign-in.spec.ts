// Signing in through the browser: the emailed code, the emailed link, and a passkey (CDP
// virtual authenticator). Each comes back to the page that asked for sign-in.
import { expect, latestMail, readSignInMail, test, uniqueEmail } from '../fixtures';

test('code: a private page sends you to sign-in and back', async ({ page, signInWithUi }) => {
  await page.goto('/account');
  await expect(page).toHaveURL('/auth/sign-in?redirect=%2Faccount');
  await signInWithUi(page, uniqueEmail('code'));
  await expect(page).toHaveURL('/account');
  await expect(page.getByText('Passkeys', { exact: true })).toBeVisible();
});

test('link: the emailed link signs in and opens the page that asked', async ({ page, secrets }) => {
  const email = uniqueEmail('link');
  secrets.push(email);
  await page.goto('/app');
  await expect(page).toHaveURL('/auth/sign-in?redirect=%2Fapp');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Email me a code' }).click();
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
  const { link, code, token } = readSignInMail(await latestMail(email));
  secrets.push(code, token);
  await page.goto(link);
  await expect(page).toHaveURL('/app');
  // A new account has no name yet: "My groups", not "Hi <first name>".
  await expect(page.getByRole('heading', { level: 1, name: 'My groups' })).toBeVisible();
});

test('passkey: add one on the account page, then sign in with it from the email field\'s autofill', async ({ page, signIn, signInPage }) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
  const user = await signIn('passkey');
  await signInPage(page, user);
  await page.goto('/account');
  await page.getByRole('button', { name: 'Add a passkey' }).click();
  await expect(page.getByText('Passkey added')).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: user.email })).toBeVisible();

  await page.context().clearCookies();
  await page.goto('/account');
  // The virtual authenticator answers the conditional (autofill) request without a pick.
  await expect(page).toHaveURL('/account');
  await expect(page.getByText('Passkeys', { exact: true })).toBeVisible();
});
