// /app's to-do list: every row opens the place where it gets done.
import type { Page } from '@playwright/test';
import { expect, ok, test, type User } from '../fixtures';

const createGroup = async (organizer: User, name: string, organizerName: string, others: [User, string][]) => {
  const group = ok(
    await organizer.trpc.mutate('group.create', {
      name, organizerName, timeZone: 'Europe/Brussels', giftDay: { date: '2099-12-24' }, exchangeMode: 'inPerson',
    })
  );
  for (const [person, personName] of others) {
    ok(await person.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name: personName }));
  }
  return group;
};

/** From /app, follows the to-do whose row starts with `text` for `groupName`. */
const followTodo = async (page: Page, text: string, groupName: string) => {
  await page.goto('/app');
  await page.getByRole('main').getByRole('link').filter({ hasText: text }).filter({ hasText: groupName }).click();
};

test('each to-do links to where it gets done', async ({ page, signIn, signInPage, db }) => {
  const [ann, bob, cee, dee] = await Promise.all(['ann', 'bob', 'cee', 'dee'].map((name) => signIn(name)));
  // Waiting: open, three in, Dee asks to join; Ann's only wish isn't shown here.
  const waiting = await createGroup(ann, 'Waiting', 'Ann', [[bob, 'Bob'], [cee, 'Cee']]);
  ok(await ann.trpc.mutate('join.updateLink', { groupSlug: waiting.slug, requiresApproval: true, maxMembers: null }));
  ok(await dee.trpc.mutate('join.accept', { groupSlug: waiting.slug, token: waiting.joinToken, name: 'Dee' }));
  ok(await ann.trpc.mutate('wish.create', { title: 'Wool socks' }));
  // Next year: drawn, then a draft next edition.
  const nextYear = await createGroup(ann, 'Next year', 'Ann', [[bob, 'Bob'], [cee, 'Cee']]);
  ok(await ann.trpc.mutate('draw.run', { groupSlug: nextYear.slug, editionNumber: 1 }));
  ok(await ann.trpc.mutate('edition.startNext', { groupSlug: nextYear.slug }));
  // Party: Bob's, at gift day, with a question from Ann's Santa delivered to Ann.
  const party = await createGroup(bob, 'Party', 'Bob', [[ann, 'Ann'], [cee, 'Cee']]);
  const partyEdition = { groupSlug: party.slug, editionNumber: 1 };
  ok(await bob.trpc.mutate('draw.run', partyEdition));
  const { _id: groupId, members } = (await db.groups.findOne({ slug: party.slug }))!;
  const { _id: editionId, draw } = (await db.editions.findOne({ groupId, number: 1 }))!;
  const annId = members.find((m) => m.userId === ann.id)!.id;
  const santaId = Object.entries(draw!.assignments).find(([, gifteeId]) => gifteeId === annId)![0];
  const santa = [bob, cee].find((user) => members.find((m) => m.id === santaId)?.userId === user.id)!;
  ok(await santa.trpc.mutate('question.ask', { ...partyEdition, text: 'Which colour do you like?' }));
  await db.editions.updateOne({ _id: editionId }, { $set: { status: 'giftday' } });

  await signInPage(page, ann);

  await test.step('join requests → let them in', async () => {
    await followTodo(page, '1 person wants to join', 'Waiting');
    await expect(page).toHaveURL(`/g/${waiting.slug}`);
    await expect(page.getByText('1 person wants to join')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Let in' })).toBeVisible();
  });

  await test.step('ready to draw → the draw button', async () => {
    await followTodo(page, "Everyone's in: ready to draw names", 'Waiting');
    await expect(page).toHaveURL(`/g/${waiting.slug}`);
    await expect(page.getByRole('button', { name: 'Draw names' })).toBeVisible();
  });

  await test.step('no wishes → my wishlist in that group', async () => {
    await followTodo(page, "Your Santa can't see any wishes here yet", 'Waiting');
    await expect(page).toHaveURL(`/g/${waiting.slug}#wishlist`);
    await expect(page.getByRole('tab', { name: 'My wishlist' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel', { name: 'My wishlist' }).getByText('Or add one from your wishlist')).toBeVisible();
  });

  await test.step('draft → open the next edition', async () => {
    await followTodo(page, "Your next Secret Santa isn't sent yet", 'Next year');
    await expect(page).toHaveURL(`/g/${nextYear.slug}`);
    await expect(page.getByRole('heading', { name: "Nothing's sent yet" })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open this edition' })).toBeVisible();
  });

  await test.step('a question from my Santa → answer it', async () => {
    await followTodo(page, 'Your Santa asked you a question', 'Party');
    await expect(page).toHaveURL(`/g/${party.slug}`);
    await expect(page.getByText('Which colour do you like?')).toBeVisible();
  });

  await test.step('gift day → the group on gift day', async () => {
    await followTodo(page, "It's gift day!", 'Party');
    await expect(page).toHaveURL(`/g/${party.slug}`);
    await expect(
      page.getByRole('list', { name: 'Where this Secret Santa is' }).getByRole('listitem').filter({ hasText: 'Gift day' })
    ).toHaveAttribute('aria-current', 'step');
  });
});

test('earlier groups: newest first, by gift day or else the year', async ({ page, signIn, signInPage, db }) => {
  const ann = await signIn('ann');
  for (const [name, year] of [['Y2021', 2021], ['Y2023', 2023], ['Y2022', 2022]] as const) {
    const { _id: groupId } = (await db.groups.findOne({ slug: (await createGroup(ann, name, 'Ann', [])).slug }))!;
    await db.editions.updateOne({ groupId, number: 1 }, { $set: { status: 'done', year }, $unset: { giftDay: '' } });
  }
  await signInPage(page, ann);
  await page.goto('/app');
  await page.getByText('Earlier (3)').click();
  await expect(page.getByRole('main').getByRole('heading', { level: 3 })).toHaveText(['Y2023', 'Y2022', 'Y2021']);
});
