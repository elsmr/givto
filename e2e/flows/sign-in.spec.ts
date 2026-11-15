// Signing in through the browser: the emailed code, the emailed link, and a passkey (CDP
// virtual authenticator). Each comes back to the page that asked for sign-in.
import { expect, latestMail, mailsTo, readSignInMail, test, uniqueEmail } from '../fixtures';

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

  await test.step('the used link again, signed in now, opens the page too', async () => {
    await page.goto(link);
    await expect(page).toHaveURL('/app');
    await expect(page.getByRole('heading', { level: 1, name: 'My groups' })).toBeVisible();
  });
});

test('code: after sending a new one, the old code points to the newest email', async ({ page, secrets }) => {
  const email = uniqueEmail('resend');
  secrets.push(email);
  await page.clock.install();
  await page.goto('/auth/sign-in');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Email me a code' }).click();
  const first = readSignInMail(await latestMail(email));
  secrets.push(first.code, first.token);
  await page.clock.fastForward('01:01');
  await page.getByRole('button', { name: 'Send a new code' }).click();
  await expect(page.getByText('New code sent.')).toBeVisible();
  await expect.poll(async () => (await mailsTo(email)).length).toBe(2);
  const second = readSignInMail(await latestMail(email));
  secrets.push(second.code, second.token);
  await page.getByLabel('6-digit code').fill(first.code);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText("That code isn't right. Only the code in the newest email works.")).toBeVisible();
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
  const verified = page.waitForResponse('**/api/auth/passkey/verify-authentication');
  await page.goto('/account');
  // The virtual authenticator answers the conditional (autofill) request without a pick.
  await expect(page).toHaveURL('/account');
  const session = await (await verified).json();
  expect(session.user.email).toBe(user.email);
  expect(session.session).not.toHaveProperty('token');
  await expect(page.getByText('Passkeys', { exact: true })).toBeVisible();
});
