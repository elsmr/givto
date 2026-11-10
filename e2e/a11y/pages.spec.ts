// axe (49) on every page an organizer and a member can reach, in each phase, light and dark.
// Fails on serious and critical violations; every page is scanned before the test reports.
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, ok, test, type TestDb, type User } from '../fixtures';

const phases = ['draft', 'open', 'drawn', 'giftday', 'done'] as const;
type Phase = (typeof phases)[number];

/** Waits until the client-rendered page has its data: no loader, no skeleton. */
const settle = async (page: Page) => {
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Loading…' })).toHaveCount(0);
  // Skeletons have no role; their data-slot (components/ui/skeleton.tsx) is the only handle.
  await expect(page.locator('[data-slot="skeleton"]')).toHaveCount(0);
  // Fades (reduced motion keeps opacity) would be measured half-way: wait for the finite ones to end.
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getComputedTiming().endTime !== Infinity).length
      )
    )
    .toBe(0);
};

/** Scans what's on screen now; soft, so one test reports every page. */
const scan = async (page: Page, label: string) => {
  await settle(page);
  const theme = await page.locator('html').getAttribute('data-theme');
  const { violations } = await new AxeBuilder({ page }).analyze();
  const serious = violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map(({ id, impact, help, nodes }) => `${id} (${impact}): ${help} → ${nodes.map((node) => node.target.join(' ')).join(', ')}`);
  expect.soft(serious, `${label} [${theme}]`).toEqual([]);
};

const visit = async (page: Page, path: string) => {
  await page.goto(path);
  await scan(page, path);
};

/** /g/<slug>: every tab; the giftee tab also with the giftee revealed. */
const scanGroupTabs = async (page: Page, slug: string) => {
  await page.goto(`/g/${slug}`);
  await settle(page);
  const tabs = page.getByRole('tablist', { name: 'This Secret Santa' }).getByRole('tab');
  for (const name of await tabs.allInnerTexts()) {
    await tabs.filter({ hasText: name }).click();
    await scan(page, `/g/${slug} › ${name}`);
    const reveal = page.getByRole('button', { name: /Tap to see who you're buying for/ });
    if (await reveal.isVisible()) {
      await reveal.click();
      await expect(page.getByRole('button', { name: 'Hide' })).toBeVisible();
      await scan(page, `/g/${slug} › ${name} (revealed)`);
    }
  }
};

/** A group of three with wishes, in `phase`; Dee waits for approval while it's open. */
const seedGroup = async (phase: Phase, people: User[], db: TestDb) => {
  const [ann, bob, cee, dee] = people;
  const group = ok(
    await ann.trpc.mutate('group.create', {
      name: `A11y ${phase}`, organizerName: 'Ann', timeZone: 'Europe/Brussels', giftDay: { date: '2099-12-24' }, exchangeMode: 'inPerson',
    })
  );
  for (const [person, name] of [[bob, 'Bob'], [cee, 'Cee']] as const) {
    ok(await person.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name }));
  }
  ok(await ann.trpc.mutate('wish.create', { title: 'Wool socks', price: { currency: 'EUR', amount: 1500 } }));
  ok(await bob.trpc.mutate('wish.create', { title: 'Cookbook', links: [{ url: 'https://shop.example/cookbook', title: 'The vegetarian cookbook', price: { currency: 'EUR', amount: 2495 } }], reallyWant: true }));
  ok(await cee.trpc.mutate('wish.create', { title: 'Scarf' }));
  if (phase === 'open') {
    ok(await ann.trpc.mutate('join.updateLink', { groupSlug: group.slug, requiresApproval: true, maxMembers: null }));
    ok(await dee.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name: 'Dee' }));
    return group;
  }
  ok(await ann.trpc.mutate('draw.run', { groupSlug: group.slug, editionNumber: 1 }));
  if (phase === 'draft') ok(await ann.trpc.mutate('edition.startNext', { groupSlug: group.slug }));
  if (phase === 'giftday' || phase === 'done') {
    const { _id: groupId } = (await db.groups.findOne({ slug: group.slug }))!;
    await db.editions.updateOne({ groupId, number: 1 }, { $set: { status: phase } });
  }
  return group;
};

for (const theme of ['light', 'dark'] as const) {
  test.describe(`${theme} theme`, () => {
    test.use({ colorScheme: theme, contextOptions: { reducedMotion: 'reduce' } });

    test('public pages', async ({ page, signIn }) => {
      const ann = await signIn('ann');
      const group = ok(await ann.trpc.mutate('group.create', { name: 'A11y join', organizerName: 'Ann', timeZone: 'Europe/Brussels', exchangeMode: 'inPerson' }));
      for (const path of ['/', '/nl', '/privacy', '/new', '/auth/sign-in', '/unsubscribe', `/g/${group.slug}/join?token=${group.joinToken}`, '/no-such-page']) {
        await visit(page, path);
      }
    });

    test('my pages', async ({ page, signIn, signInPage }) => {
      const ann = await signIn('ann');
      ok(await ann.trpc.mutate('group.create', { name: 'A11y mine', organizerName: 'Ann', timeZone: 'Europe/Brussels', exchangeMode: 'inPerson' }));
      ok(await ann.trpc.mutate('wish.create', { title: 'Wool socks', description: 'Size 42', price: { currency: 'EUR', amount: 1500 } }));
      await signInPage(page, ann);
      for (const path of ['/app', '/wishlist', '/account', '/new']) await visit(page, path);
    });

    for (const phase of phases) {
      // Each test runs axe on up to 10 pages: too slow for the default timeout on a busy machine.
      test(`${phase}: organizer`, async ({ page, signIn, signInPage, db }) => {
        test.slow();
        const people = await Promise.all(['ann', 'bob', 'cee', 'dee'].map((name) => signIn(name)));
        const group = await seedGroup(phase, people, db);
        await signInPage(page, people[0]);
        await scanGroupTabs(page, group.slug);
        await visit(page, `/g/${group.slug}/settings`);
        if (phase !== 'open') await visit(page, `/g/${group.slug}/present`);
        if (phase === 'draft') await visit(page, `/g/${group.slug}/1`);
      });

      test(`${phase}: member`, async ({ page, signIn, signInPage, db }) => {
        test.slow();
        const people = await Promise.all(['ann', 'bob', 'cee', 'dee'].map((name) => signIn(name)));
        const group = await seedGroup(phase, people, db);
        await signInPage(page, people[1]);
        await scanGroupTabs(page, group.slug);
        await visit(page, `/g/${group.slug}/settings`);
      });
    }
  });
}
