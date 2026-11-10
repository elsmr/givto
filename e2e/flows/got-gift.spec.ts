import { expect, ok, test } from '../fixtures';
import { drawnGroup } from '../api/s6-helpers';

test("I've got my gift: Dibs! pre-checked, add a line, saved; the organizer sees who's still shopping", async ({ page, signIn, signInPage, db }) => {
  const people = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const [ann] = people;
  const group = await drawnGroup(people, 'Shopping');
  const at = { groupSlug: group.slug, editionNumber: 1 };
  const { _id: groupId, members } = (await db.groups.findOne({ slug: group.slug }))!;
  const { draw } = (await db.editions.findOne({ groupId, number: 1 }))!;
  const gifteeId = draw!.assignments[members.find((m) => m.userId === ann.id)!.id];
  const giftee = people.find((p) => members.find((m) => m.id === gifteeId)?.userId === p.id)!;
  const mug = ok(await giftee.trpc.mutate('wish.create', { title: 'Moomin mug', links: [{ url: 'https://www.bol.com/nl/nl/p/moomin-mok/9300000012345678/' }], groupSlugs: [group.slug] }));
  ok(await giftee.trpc.mutate('wish.create', { title: 'Green socks', groupSlugs: [group.slug] }));
  ok(await ann.trpc.mutate('claim.add', { ...at, wishId: mug.id }));

  await signInPage(page, ann);
  await page.goto(`/g/${group.slug}#giftee`);
  await page.getByRole('button', { name: "Tap to see who you're buying for" }).click();
  await page.getByRole('button', { name: "I've got my gift" }).click();
  const dialog = page.getByRole('dialog', { name: 'What did you get?' });
  await expect(dialog.getByRole('checkbox', { name: 'Moomin mug' }), 'Dibs! pre-checked').toBeChecked();
  await expect(dialog.getByRole('checkbox', { name: 'Green socks' })).not.toBeChecked();
  await dialog.getByLabel('Something else').fill('A scarf');
  await dialog.getByRole('button', { name: 'Add' }).click();
  await expect(dialog.getByText('A scarf')).toBeVisible();
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("You've got 2 gifts")).toBeVisible();
  const mugCard = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: 'Moomin mug' }) });
  await expect(mugCard.getByText('Bought'), 'the same card, marked bought (73)').toBeVisible();
  await expect(mugCard.getByRole('link', { name: /^Buy at bol\.com/ })).toHaveAttribute('rel', 'noopener noreferrer nofollow ugc');

  await page.goto(`/g/${group.slug}`);
  const others = members.filter((m) => m.userId !== ann.id).map((m) => m.name).toSorted();
  await expect(page.getByText(`Still shopping: ${others.join(' and ')}`)).toBeVisible();
});
