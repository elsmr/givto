// The group home by phase (61): the phase stepper, the tabs in the URL hash, the app nav on
// phones and desktop, and notices that only show when there's something to see.
import type { Page } from '@playwright/test';
import { ObjectId } from 'mongodb';
import { expect, ok, test, type User } from '../fixtures';
import { drawnGroup } from '../api/s6-helpers';
import { drawOf } from './draw-seed';

const stepper = (page: Page) => page.getByRole('list', { name: 'Where this Secret Santa is' });

/** The stepper has exactly one current step, `current`; the ones before it are ticked "finished". */
const expectPhase = async (page: Page, current: string) => {
  const steps = stepper(page).getByRole('listitem');
  await expect(steps).toHaveCount(5);
  await expect(stepper(page).locator('[aria-current="step"]')).toHaveCount(1);
  await expect(steps.filter({ hasText: current })).toHaveAttribute('aria-current', 'step');
  const names = ['Join', 'Draw', 'Shop', 'Gift day', 'Done'];
  for (const [index, name] of names.entries()) {
    const step = steps.nth(index);
    await expect(step).toContainText(name);
    if (index < names.indexOf(current)) await expect(step).toContainText('finished');
    else await expect(step).not.toContainText('finished');
  }
};

const tab = (page: Page, name: string) => page.getByRole('tablist', { name: 'This Secret Santa' }).getByRole('tab', { name });

const openGroup = async (ann: User, bob: User, name: string) => {
  const group = ok(
    await ann.trpc.mutate('group.create', { name, organizerName: 'Ann', timeZone: 'Europe/Brussels', giftDay: { date: '2099-12-24' }, exchangeMode: 'inPerson' })
  );
  ok(await bob.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name: 'Bob' }));
  return group;
};

test('the stepper shows the current phase, from join to done', async ({ page, newPage, signIn, signInPage, db }) => {
  const [ann, bob, cee] = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const group = await openGroup(ann, bob, 'Stepper');
  const edition = { groupSlug: group.slug, editionNumber: 1 };
  await signInPage(page, ann);
  await page.goto(`/g/${group.slug}`);

  await test.step('two people in: Join', () => expectPhase(page, 'Join'));

  await test.step('three people in: Draw', async () => {
    ok(await cee.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name: 'Cee' }));
    await page.reload();
    await expectPhase(page, 'Draw');
  });

  await test.step('names drawn: Shop, for the organizer and a member', async () => {
    ok(await ann.trpc.mutate('draw.run', edition));
    await page.reload();
    await expectPhase(page, 'Shop');
    const bobPage = await newPage();
    await signInPage(bobPage, bob);
    await bobPage.goto(`/g/${group.slug}`);
    await expectPhase(bobPage, 'Shop');
  });

  const { _id: groupId } = (await db.groups.findOne({ slug: group.slug }))!;
  for (const [status, phase] of [['giftday', 'Gift day'], ['done', 'Done']] as const) {
    await test.step(`${status}: ${phase}`, async () => {
      await db.editions.updateOne({ groupId, number: 1 }, { $set: { status } });
      await page.reload();
      await expectPhase(page, phase);
    });
  }
});

test('tabs switch, keep their hash on reload and back; My giftee only after the draw', async ({ page, signIn, signInPage }) => {
  const [ann, bob, cee] = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const group = await openGroup(ann, bob, 'Tabs');
  ok(await cee.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name: 'Cee' }));
  await signInPage(page, bob);
  const tabs = page.getByRole('tablist', { name: 'This Secret Santa' }).getByRole('tab');

  await test.step('before the draw: no My giftee tab', async () => {
    await page.goto(`/g/${group.slug}#giftee`);
    await expect(tabs).toHaveText(['Overview', 'My wishlist', 'People']);
    await expect(tab(page, 'Overview'), 'an unknown tab falls back to the overview').toHaveAttribute('aria-selected', 'true');
  });

  ok(await ann.trpc.mutate('draw.run', { groupSlug: group.slug, editionNumber: 1 }));
  await page.goto(`/g/${group.slug}`);
  await expect(tabs).toHaveText(['Overview', 'My giftee', 'My wishlist', 'People']);

  await test.step('switching keeps the tab in the hash, and a reload keeps it', async () => {
    for (const [name, hash] of [['People', '#people'], ['My wishlist', '#wishlist'], ['My giftee', '#giftee']] as const) {
      await tab(page, name).click();
      await expect(tab(page, name)).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByRole('tabpanel', { name })).toBeVisible();
      await expect(page).toHaveURL(`/g/${group.slug}${hash}`);
    }
    await page.reload();
    await expect(tab(page, 'My giftee')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('button', { name: "Tap to see who you're buying for" })).toBeVisible();
  });

  await test.step('away and back: the tab is still there', async () => {
    await tab(page, 'People').click();
    await expect(page).toHaveURL(`/g/${group.slug}#people`);
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'My wishlist' }).click();
    await expect(page).toHaveURL('/wishlist');
    await page.goBack();
    await expect(page).toHaveURL(`/g/${group.slug}#people`);
    await expect(tab(page, 'People')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel', { name: 'People' })).toBeVisible();
    await expect(page).toHaveURL(`/g/${group.slug}#people`);
  });

  await test.step('Overview drops the hash', async () => {
    await tab(page, 'Overview').click();
    await expect(page).toHaveURL(`/g/${group.slug}`);
    await expect(page.getByRole('tabpanel', { name: 'Overview' })).toBeVisible();
  });
});

test('the app nav: a bar at the bottom on phones, a rail on desktop; the tabs fit in one row', async ({ page, signIn, signInPage }, testInfo) => {
  const [ann, bob, cee] = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const group = await drawnGroup([ann, bob, cee], 'Thumbs');
  await signInPage(page, bob);
  await page.goto(`/g/${group.slug}`);
  const nav = page.getByRole('navigation', { name: 'Main' });
  await expect(nav.getByRole('link', { name: 'Home' }), 'group pages live under Home').toHaveAttribute('aria-current', 'true');
  const viewport = page.viewportSize()!;

  const box = async () => (await nav.boundingBox())!;
  if (testInfo.project.name === 'mobile') {
    await expect.poll(async () => Math.round((await box()).y + (await box()).height)).toBe(viewport.height);
    await page.getByRole('contentinfo').scrollIntoViewIfNeeded();
    await expect.poll(async () => Math.round((await box()).y + (await box()).height), 'still stuck to the bottom').toBe(viewport.height);
    await page.evaluate(() => window.scrollTo(0, 0));
  } else {
    await expect.poll(async () => (await box()).x).toBe(0);
    await expect.poll(async () => Math.round((await box()).height)).toBe(viewport.height);
  }

  const tabs = page.getByRole('tablist', { name: 'This Secret Santa' }).getByRole('tab');
  await expect(tabs).toHaveCount(4);
  const boxes = await Promise.all((await tabs.all()).map(async (t) => (await t.boundingBox())!));
  for (const tabBox of boxes) {
    // The active tab is raised by a few pixels.
    expect(Math.abs(tabBox.y - boxes[0].y), 'one row').toBeLessThan(tabBox.height / 2);
    expect(tabBox.x + tabBox.width, 'inside the screen').toBeLessThanOrEqual(viewport.width);
  }
  await tab(page, 'People').click();
  await expect(page.getByRole('tabpanel', { name: 'People' })).toBeVisible();
});

test('the people stat fits as many avatars as it has room for and counts the rest', async ({ page, signIn, signInPage, db }, testInfo) => {
  const [ann, bob] = await Promise.all(['ann', 'bob'].map((name) => signIn(name)));
  const group = await openGroup(ann, bob, 'Crowd');
  const { _id: groupId } = (await db.groups.findOne({ slug: group.slug }))!;
  const now = new Date();
  const crowd = ['Cee', 'Dee', 'Eve', 'Fay', 'Gus', 'Hal', 'Ivy', 'Jan', 'Kim', 'Lou'].map((name) => ({
    id: new ObjectId().toHexString(), name, role: 'member' as const, status: 'joined' as const, joinedAt: now,
    wishlistView: { includeNewWishes: true, hiddenWishIds: [] },
  }));
  await db.groups.updateOne({ _id: groupId }, { $push: { members: { $each: crowd } } });
  const participants = crowd.map((m) => ({ memberId: m.id, participates: true, status: 'joined' as const, addedAt: now }));
  await db.editions.updateOne({ groupId, number: 1 }, { $push: { participants: { $each: participants } } });
  await signInPage(page, ann);
  await page.goto(`/g/${group.slug}`);

  const card = page.getByRole('button', { name: '12 People people in' });
  const stack = card.locator('[data-slot="avatar-group"]');
  await expect(stack.locator('[data-slot="avatar-group-count"]')).toBeVisible();
  const shown = await stack.locator('[data-slot="avatar"]').count();
  if (testInfo.project.name === 'mobile') expect(shown).toBe(5);
  else expect(shown).toBeGreaterThanOrEqual(3);
  await expect(stack.locator('[data-slot="avatar-group-count"]')).toHaveText(`+${12 - shown}`);
  const [cardBox, stackBox] = [(await card.boundingBox())!, (await stack.boundingBox())!];
  expect(stackBox.x + stackBox.width, 'inside the card').toBeLessThanOrEqual(cardBox.x + cardBox.width);
});

test('notices show only when there is something: join requests, Psst! and questions', async ({ page, newPage, signIn, signInPage, db }) => {
  const people = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const [ann, bob] = people;
  const dee = await signIn('dee');
  const group = await drawnGroup(people, 'Notices');
  const edition = { groupSlug: group.slug, editionNumber: 1 };
  const draw = await drawOf(db, group.slug, people);
  const annSanta = draw.santaOf(ann);
  const joinRequest = page.getByRole('heading', { name: '1 person wants to join' });
  const psst = page.getByRole('status').filter({ hasText: 'Psst!' });
  const questions = page.getByRole('heading', { name: 'Your Santa asked…' });

  await signInPage(page, ann);
  await page.goto(`/g/${group.slug}`);
  await test.step('nothing to see: no notices', async () => {
    await expect(page.getByRole('button', { name: "Tap to see who you're buying for" })).toBeVisible();
    await expect(joinRequest).toHaveCount(0);
    await expect(psst).toHaveCount(0);
    await expect(questions).toHaveCount(0);
  });

  await test.step('someone asks to join: the organizer sees it, a member does not', async () => {
    ok(await ann.trpc.mutate('join.updateLink', { groupSlug: group.slug, requiresApproval: true, maxMembers: null }));
    ok(await dee.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name: 'Dee' }));
    await page.reload();
    await expect(joinRequest).toBeVisible();
    const bobPage = await newPage();
    await signInPage(bobPage, bob);
    await bobPage.goto(`/g/${group.slug}`);
    await expect(bobPage.getByRole('button', { name: "Tap to see who you're buying for" })).toBeVisible();
    await expect(bobPage.getByRole('heading', { name: '1 person wants to join' })).toHaveCount(0);
  });

  await test.step('a Psst! and a question from my Santa: hidden until their delivery time', async () => {
    ok(await annSanta.trpc.mutate('nudge.send', { ...edition, kind: 'emptyWishlist' }));
    ok(await annSanta.trpc.mutate('question.ask', { ...edition, text: 'Tea or coffee?' }));
    await page.reload();
    await expect(joinRequest).toBeVisible();
    await expect(psst).toHaveCount(0);
    await expect(questions).toHaveCount(0);
  });

  await test.step('delivered: both show', async () => {
    await db.nudges.updateMany({ editionId: draw.editionId }, { $set: { sendAfter: new Date(Date.now() - 1000) } });
    await db.questions.updateMany({ editionId: draw.editionId }, { $set: { notifyAfter: new Date(Date.now() - 1000) } });
    await page.reload();
    await expect(psst).toContainText('Your Santa would love some ideas. Add a few wishes to your wishlist.');
    await expect(questions).toBeVisible();
    await expect(page.getByText('Tea or coffee?')).toBeVisible();
  });
});
