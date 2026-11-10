// One wishlist, several groups (38): pick the wishes each group sees, confirming one already in another active group, in each group's own order; Dibs! from a Santa, shown as
// "Taken" to Santas in other groups and never to the wishlist's owner. Archived (76): only the Santa
// with Dibs! still sees it, as no longer on the list.
import type { Locator, Page } from '@playwright/test';
import { expect, ok, test, type TestDb, type User } from '../fixtures';

/** A drawn group of the organizer and two others; returns its slug and who drew `giftee`. */
const drawnGroup = async (db: TestDb, name: string, people: [User, string][], giftee: User) => {
  const [[organizer, organizerName], ...others] = people;
  const group = ok(
    await organizer.trpc.mutate('group.create', {
      name, organizerName, timeZone: 'Europe/Brussels', giftDay: { date: '2099-12-24' }, exchangeMode: 'inPerson',
    })
  );
  for (const [person, personName] of others) {
    ok(await person.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name: personName }));
  }
  ok(await organizer.trpc.mutate('draw.run', { groupSlug: group.slug, editionNumber: 1 }));
  const { _id: groupId, members } = (await db.groups.findOne({ slug: group.slug }))!;
  const { draw } = (await db.editions.findOne({ groupId, number: 1 }))!;
  const gifteeId = members.find((m) => m.userId === giftee.id)!.id;
  const santaId = Object.entries(draw!.assignments).find(([, id]) => id === gifteeId)![0];
  const santa = people.find(([person]) => members.find((m) => m.id === santaId)?.userId === person.id)![0];
  return { slug: group.slug, santa };
};

/** The Santa's "My giftee" tab, revealed, with Olive's wishlist. */
const openGifteeWishlist = async (page: Page, slug: string) => {
  await page.goto(`/g/${slug}#giftee`);
  await page.getByRole('button', { name: /Tap to see who you're buying for/ }).click();
  const tab = page.getByRole('tabpanel', { name: 'My giftee' });
  await expect(tab.getByRole('heading', { name: "Olive's wishlist" })).toBeVisible();
  return tab;
};
const wishTitles = (tab: Locator) => tab.getByRole('listitem').getByRole('heading', { level: 3 });

test('show wishes per group; Dibs! is "Taken" elsewhere and never shown to the owner', async ({ page, newPage, signIn, signInPage, db }) => {
  const [olive, ann, bob, cee, dan] = await Promise.all(['olive', 'ann', 'bob', 'cee', 'dan'].map((name) => signIn(name)));
  const family = await drawnGroup(db, 'Family', [[ann, 'Ann'], [bob, 'Bob'], [olive, 'Olive']], olive);
  const friends = await drawnGroup(db, 'Friends', [[cee, 'Cee'], [dan, 'Dan'], [olive, 'Olive']], olive);
  for (const title of ['Cookbook', 'Wool socks']) ok(await olive.trpc.mutate('wish.create', { title, groupSlugs: [friends.slug] }));

  await test.step('Olive shows only the cookbook in Family, after a warning that Friends sees it too', async () => {
    await signInPage(page, olive);
    await page.goto(`/g/${family.slug}#wishlist`);
    const tab = page.getByRole('tabpanel', { name: 'My wishlist' });
    await tab.getByText('2 wishes hidden here').click();
    await tab.getByRole('button', { name: 'Show “Cookbook” in this group' }).click();
    await page.getByRole('dialog', { name: 'Already shown in Friends' }).getByRole('button', { name: 'Show here too' }).click();
    await expect(tab.getByRole('listitem').filter({ hasText: 'Cookbook' }).getByText('Also in Friends')).toBeVisible();
    await expect(tab.getByText('1 wish hidden here')).toBeVisible();
  });

  await test.step('Olive puts the cookbook first in Friends only', async () => {
    await page.goto(`/g/${friends.slug}#wishlist`);
    await page.getByRole('tabpanel', { name: 'My wishlist' }).getByRole('button', { name: 'Move “Cookbook” up' }).click();
    await expect.poll(async () => ok(await olive.trpc.query('wish.groupView', { groupSlug: friends.slug })).map((wish) => wish.title)).toEqual(['Cookbook', 'Wool socks']);
  });

  const friendsSanta = await newPage();
  await test.step("Olive's Santa in Friends sees both wishes and calls Dibs! on the cookbook", async () => {
    await signInPage(friendsSanta, friends.santa);
    const wishlist = await openGifteeWishlist(friendsSanta, friends.slug);
    await expect(wishTitles(wishlist)).toHaveText(['Cookbook', 'Wool socks']);
    await wishlist.getByRole('button', { name: 'Dibs on “Cookbook”' }).click();
    await expect(wishlist.getByText("Dibs! It's yours")).toBeVisible();
    await expect(wishlist.getByRole('button', { name: 'Undo dibs on “Cookbook”' })).toBeVisible();
  });

  const familySanta = await newPage();
  await test.step("Olive's Santa in Family doesn't see the socks, and sees the cookbook taken", async () => {
    await signInPage(familySanta, family.santa);
    const wishlist = await openGifteeWishlist(familySanta, family.slug);
    await expect(wishTitles(wishlist)).toHaveText(['Cookbook']);
    await expect(wishlist.getByText('Someone else is getting this one.')).toBeVisible();
    await expect(wishlist.getByRole('button', { name: /Dibs on/ })).toHaveCount(0);
  });

  await test.step('Olive never sees a claim', async () => {
    for (const path of ['/wishlist', `/g/${family.slug}#wishlist`, `/g/${friends.slug}#wishlist`]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: 'Cookbook' }).first()).toBeVisible();
      await expect(page.getByRole('main')).not.toContainText(/Dibs|Taken|Someone else is getting/);
    }
  });

  await test.step('Olive archives the cookbook: only the Santa with Dibs! still sees it', async () => {
    await page.goto('/wishlist');
    await page.getByRole('button', { name: 'Archive “Cookbook”' }).click();
    await expect(page.getByRole('heading', { name: 'Archived (1)' })).toBeVisible();
    await expect(page.getByRole('main')).not.toContainText(/Dibs|Taken|No longer on the list/);
    // A reload hides the giftee again (the reveal is per page load), so the tap is there again.
    await friendsSanta.reload();
    const withDibs = await openGifteeWishlist(friendsSanta, friends.slug);
    await expect(wishTitles(withDibs)).toHaveText(['Wool socks', 'Cookbook']);
    await expect(withDibs.getByRole('listitem').filter({ hasText: 'Cookbook' }).getByText('No longer on the list')).toBeVisible();
    await familySanta.reload();
    await familySanta.getByRole('button', { name: /Tap to see who you're buying for/ }).click();
    await expect(familySanta.getByRole('tabpanel', { name: 'My giftee' }).getByText("Olive hasn't added any wishes yet.")).toBeVisible();
  });
});
