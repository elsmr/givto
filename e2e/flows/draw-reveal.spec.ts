// The draw from the overview (34, 64), the reveal (tap, hide, tap again), and the My giftee tab:
// their wishlist, tips for you, an anonymous question and a Psst! that the giftee only sees once
// delivered (30, 42, 52).
import type { Page } from '@playwright/test';
import { expect, ok, test } from '../fixtures';
import { drawnGroup } from '../api/s6-helpers';
import { drawOf } from './draw-seed';

const stepper = (page: Page) => page.getByRole('list', { name: 'Where this Secret Santa is' });
const tapToReveal = (page: Page) => page.getByRole('button', { name: "Tap to see who you're buying for" });
/** The revealed side of the reveal card: "You're buying for" and the name. */
const revealed = (page: Page) => page.getByText("You're buying for", { exact: true }).locator('..');

test('the organizer draws names from the overview; a member reveals, hides and reveals again', async ({ page, newPage, signIn, signInPage, db }) => {
  const people = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const [ann, bob, cee] = people;
  const dan = await signIn('dan');
  const group = ok(
    await ann.trpc.mutate('group.create', { name: 'Drawing', organizerName: 'Ann', timeZone: 'Europe/Brussels', giftDay: { date: '2099-12-24' }, exchangeMode: 'inPerson' })
  );
  for (const [person, name] of [[bob, 'Bob'], [cee, 'Cee']] as const) {
    ok(await person.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name }));
  }
  ok(await ann.trpc.mutate('join.updateLink', { groupSlug: group.slug, requiresApproval: true, maxMembers: null }));
  ok(await dan.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name: 'Dan' }));

  await test.step('Draw names: the dialog says who is left out, then the page moves to Shop', async () => {
    await signInPage(page, ann);
    await page.goto(`/g/${group.slug}`);
    await expect(stepper(page).locator('[aria-current="step"]')).toContainText('Draw');
    await page.getByRole('button', { name: 'Draw names' }).click();
    const dialog = page.getByRole('dialog', { name: 'Draw names now?' });
    await expect(dialog).toContainText('Anyone can draw anyone.');
    await expect(dialog).toContainText('Not in this draw: Dan.');
    await dialog.getByRole('button', { name: 'Draw names' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText('Names drawn!')).toBeVisible();
    await expect(stepper(page).locator('[aria-current="step"]')).toContainText('Shop');
    await expect(tapToReveal(page)).toBeVisible();
  });

  const draw = await drawOf(db, group.slug, people);
  expect(Object.keys(draw.assignments).toSorted()).toEqual(people.map((person) => draw.memberIdOf(person)).toSorted());
  const gifteeName = draw.nameOf(draw.gifteeOf(bob));

  const bobPage = await newPage();
  await signInPage(bobPage, bob);
  await bobPage.goto(`/g/${group.slug}`);
  await test.step('Bob taps to see his giftee, hides it, and taps again', async () => {
    await expect(revealed(bobPage).getByText(gifteeName, { exact: true })).toHaveCount(0);
    await tapToReveal(bobPage).click();
    await expect(revealed(bobPage).getByText(gifteeName, { exact: true })).toBeVisible();
    await bobPage.getByRole('button', { name: 'Hide' }).click();
    await expect(revealed(bobPage).getByText(gifteeName, { exact: true })).toHaveCount(0);
    await expect(tapToReveal(bobPage)).toBeFocused();
    await tapToReveal(bobPage).click();
    await expect(revealed(bobPage).getByText(gifteeName, { exact: true })).toBeVisible();
  });

  await test.step('after a reload the name is hidden again until tapped', async () => {
    await bobPage.reload();
    await expect(tapToReveal(bobPage)).toBeVisible();
    await expect(revealed(bobPage).getByText(gifteeName, { exact: true })).toHaveCount(0);
  });
});

test("My giftee: their wishlist, tips for you, ask a question and Psst!; the giftee sees them once delivered", async ({ page, newPage, signIn, signInPage, db }) => {
  const people = await Promise.all(['ann', 'bob', 'cee', 'dan'].map((name) => signIn(name)));
  const [ann] = people;
  const group = await drawnGroup(people, 'Giftee tab');
  const edition = { groupSlug: group.slug, editionNumber: 1 };
  const draw = await drawOf(db, group.slug, people);
  const giftee = draw.gifteeOf(ann);
  const name = draw.nameOf(giftee);
  const tipper = people.find((person) => person !== ann && person !== giftee)!;
  ok(await giftee.trpc.mutate('wish.create', { title: 'Moomin mug', groupSlugs: [group.slug] }));
  ok(await tipper.trpc.mutate('tip.create', { ...edition, aboutMemberId: draw.memberIdOf(giftee), text: 'Loves green tea', anonymous: false }));

  await signInPage(page, ann);
  await page.goto(`/g/${group.slug}`);
  await tapToReveal(page).click();
  await page.getByRole('button', { name: 'Their wishlist and tips' }).click();
  await expect(page).toHaveURL(`/g/${group.slug}#giftee`);
  const panel = page.getByRole('tabpanel', { name: 'My giftee' });

  await test.step('their wishlist and the tips for me', async () => {
    await expect(panel.getByRole('heading', { name: `${name}'s wishlist` })).toBeVisible();
    await expect(panel.getByRole('heading', { name: 'Moomin mug' })).toBeVisible();
    await expect(panel.getByRole('heading', { name: `Shopping for ${name}` })).toBeVisible();
    await expect(panel.getByText('Loves green tea')).toBeVisible();
    await expect(panel.getByText(`From ${draw.nameOf(tipper)}`)).toBeVisible();
  });

  await test.step('ask a question anonymously', async () => {
    await panel.getByLabel('Your question').fill('What size are you?');
    await panel.getByRole('button', { name: 'Ask anonymously' }).click();
    await expect(page.getByText(`Question on its way. ${name} gets it shortly.`)).toBeVisible();
    await expect(panel.getByRole('heading', { name: 'Your questions' })).toBeVisible();
    await expect(panel.getByText('What size are you?')).toBeVisible();
    await expect(panel.getByText('No answer yet')).toBeVisible();
  });

  await test.step('send a Psst!: one per few days', async () => {
    await expect(panel.getByText(`Send a Psst! and ${name} will hear their Santa would love more detail on their wishes.`)).toBeVisible();
    await panel.getByRole('button', { name: 'Send Psst!' }).click();
    await expect(page.getByText(`Psst! sent. ${name} hears about it shortly, without your name.`)).toBeVisible();
    await expect(panel.getByText(/^You can send another Psst! from /)).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Send Psst!' })).toHaveCount(0);
  });

  const gifteePage = await newPage();
  await signInPage(gifteePage, giftee);
  const psst = gifteePage.getByRole('status').filter({ hasText: 'Psst!' });
  await test.step('the giftee sees the Psst! and the question right away, and answers', async () => {
    await gifteePage.goto(`/g/${group.slug}`);
    await expect(psst).toContainText('Your Santa would love a bit more detail on your wishes: sizes, colours, links.');
    await expect(gifteePage.getByText('What size are you?')).toBeVisible();
    await gifteePage.getByLabel('Your answer').fill('Medium');
    await gifteePage.getByRole('button', { name: 'Send answer' }).click();
    await expect(gifteePage.getByText('Your answer:')).toBeVisible();
    await expect(gifteePage.getByText('Medium')).toBeVisible();
  });

  await test.step('Ann reads the answer', async () => {
    await page.reload();
    await tapToReveal(page).click();
    await expect(panel.getByText('Answer:')).toBeVisible();
    await expect(panel.getByText('Medium')).toBeVisible();
    await expect(panel.getByText('No answer yet')).toHaveCount(0);
  });
});
