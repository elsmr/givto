// Gift day (31, 32, 63, 69): the presenter for the organizer: intro, spin (or skip it), turns with
// gift counts all at once and one by one ("Gift 2 of 3", the manual fallback), the big reveal one
// pair at a time; members can't open it; reduced motion still shows everything.
import type { Page } from '@playwright/test';
import type { UnwrapMode } from '@/lib/schema/edition';
import { expect, ok, test, type TestDb, type User } from '../fixtures';
import { drawnGroup } from '../api/s6-helpers';
import { drawOf } from './draw-seed';

/**
 * Ann, Bob and Cee on gift day with a shuffled unwrap order. `counts[i]`: how many gifts the i-th
 * person in the unwrap order gets, as their Santa marked them; null: their Santa marked nothing.
 */
const giftDayGroup = async (db: TestDb, people: User[], name: string, { mode, counts, reveal }: { mode: UnwrapMode; counts: (number | null)[]; reveal: boolean }) => {
  const [ann] = people;
  const group = await drawnGroup(people, name);
  const at = { groupSlug: group.slug, editionNumber: 1 };
  if (reveal) ok(await ann.trpc.mutate('giftday.setReveal', { ...at, enabled: true }));
  ok(await ann.trpc.mutate('giftday.setMode', { ...at, mode }));
  ok(await ann.trpc.mutate('giftday.shuffle', at));
  const order = ok(await ann.trpc.query('giftday.presenter', at)).unwrapOrder!.people;
  const draw = await drawOf(db, group.slug, people);
  const userOf = (memberId: string) => people.find((person) => draw.memberIdOf(person) === memberId)!;
  for (const [i, count] of counts.entries()) {
    if (count === null) continue;
    const lines = Array.from({ length: count }, (_, k) => `Gift ${k + 1}`);
    ok(await draw.santaOf(userOf(order[i].memberId)).trpc.mutate('gift.set', { ...at, wishIds: [], lines }));
  }
  await db.editions.updateOne({ _id: draw.editionId }, { $set: { status: 'giftday' } });
  const pairs = people.map((person) => `${draw.nameOf(person)} got a gift from ${draw.nameOf(draw.santaOf(person))}`);
  return { slug: group.slug, names: order.map((person) => person.name), countOf: (user: User) => counts[order.findIndex((p) => p.memberId === draw.memberIdOf(user))], pairs };
};

/** Names on the stage are paragraphs; the spinning reel's strip is aria-hidden, so it never matches. */
const shownName = (page: Page, name: string) => page.getByRole('paragraph').filter({ hasText: new RegExp(`^${name}$`) });
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

/** From the group page's gift day card to the presenter's intro. */
const openPresenter = async (page: Page, slug: string) => {
  await page.goto(`/g/${slug}`);
  await expect(page.getByRole('heading', { level: 2, name: "It's gift day!" })).toBeVisible();
  await page.getByRole('link', { name: 'Open the presenter view' }).click();
  await expect(page).toHaveURL(`/g/${slug}/present`);
  await expect(page.getByText('Press → or space for the first person.')).toBeVisible();
  await expect(button(page, 'Previous')).toBeDisabled();
};

/** When each of the big reveal's pairs is fully shown, in ms (performance.now). */
const pairsShownAt = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<number[]>((resolve) => {
        const shownAt: number[] = [];
        const check = () => {
          const pairs = [...document.querySelectorAll('[aria-label="Who was whose Santa"] li')];
          pairs.forEach((pair, i) => {
            if (shownAt[i] === undefined && getComputedStyle(pair).opacity === '1') shownAt[i] = performance.now();
          });
          if (pairs.length > 0 && shownAt.filter((time) => time !== undefined).length === pairs.length) resolve(shownAt);
          else requestAnimationFrame(check);
        };
        check();
      })
  );

test('presenter, all at once: intro, spin or skip it, turns with gift counts, the big reveal one pair at a time', async ({ page, newPage, signIn, signInPage, db }) => {
  const people = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const [ann, bob] = people;
  const giftDay = await giftDayGroup(db, people, 'Presents', { mode: 'allAtOnce', counts: [2, null, 1], reveal: true });
  const [first, second, third] = giftDay.names;
  await signInPage(page, ann);

  await test.step('the organizer sees how many gifts they get, and opens the presenter', async () => {
    await page.goto(`/g/${giftDay.slug}`);
    const count = giftDay.countOf(ann);
    const toOpen = page.getByText(/^\d+ gifts? to open$/);
    if (count === null) await expect(toOpen).toHaveCount(0);
    else await expect(toOpen).toHaveText(`${count} ${count === 1 ? 'gift' : 'gifts'} to open`);
    await openPresenter(page, giftDay.slug);
    await expect(page.getByRole('heading', { level: 2, name: "It's gift day!" })).toBeVisible();
  });

  await test.step('→ starts; the highlight hops and lands on the first person: 1 of 3 · 2 gifts', async () => {
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('heading', { name: "Who's next?" })).toBeVisible();
    await button(page, 'Spin').click();
    // Three left: the highlight hops between their cards for about 4 seconds first.
    await expect(page.getByText('1 of 3 · 2 gifts', { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(shownName(page, first)).toBeVisible();
    await expect(page.getByText('Next to unwrap')).toBeVisible();
  });

  await test.step('skip the spin: the second person, no count', async () => {
    await button(page, 'Next').click();
    await expect(page.getByRole('heading', { name: "Who's next?" })).toBeVisible();
    await page.getByRole('switch', { name: 'Skip the spin' }).click();
    await button(page, 'Spin').click();
    await expect(page.getByText('2 of 3', { exact: true })).toBeVisible();
    await expect(shownName(page, second)).toBeVisible();
  });

  await test.step('one person left: no spin', async () => {
    await button(page, 'Next').click();
    await expect(page.getByText('3 of 3 · 1 gift', { exact: true })).toBeVisible();
    await expect(shownName(page, third)).toBeVisible();
    const bobPage = await newPage();
    await signInPage(bobPage, bob);
    await bobPage.goto(`/g/${giftDay.slug}`);
    // The full unwrap order further down is collapsed; the gift day card shows who is up.
    await expect(bobPage.getByText(`Now unwrapping: ${third}`).filter({ visible: true })).toHaveCount(1);
  });

  await test.step('the big reveal: the pairs come one at a time', async () => {
    await button(page, 'Next').click();
    await expect(page.getByText('Press → or space to reveal who was whose Santa.')).toBeVisible();
    const shownAt = pairsShownAt(page);
    await button(page, 'Reveal who was whose Santa').click();
    const pairs = page.getByRole('list', { name: 'Who was whose Santa' }).getByRole('listitem');
    await expect(pairs).toHaveCount(3);
    for (const pair of giftDay.pairs) await expect(pairs.filter({ hasText: pair })).toBeVisible();
    const [a, b, c] = await shownAt;
    expect(b - a, 'the second pair a beat after the first').toBeGreaterThan(300);
    expect(c - b, 'the third a beat after the second').toBeGreaterThan(300);
  });

  await test.step("the end: that's everyone", async () => {
    await button(page, 'Next').click();
    await expect(page.getByRole('heading', { name: "That's everyone!" })).toBeVisible();
    await expect(button(page, 'Next')).toHaveCount(0);
  });
});

test('presenter, one by one: "Gift 2 of 3", and "That was the last one" when nobody counted', async ({ page, signIn, signInPage, db }) => {
  const people = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  // First in the order 3 gifts, second unknown (their Santa marked nothing), third 1.
  const giftDay = await giftDayGroup(db, people, 'Rounds', { mode: 'oneByOne', counts: [3, null, 1], reveal: false });
  const [first, second, third] = giftDay.names;
  await signInPage(page, people[0]);
  await openPresenter(page, giftDay.slug);
  await page.getByRole('switch', { name: 'Skip the spin' }).click();
  await button(page, 'Next').click();

  /** Spins (skipped) when there's more than one person left, then checks whose turn it is. */
  const turn = async (name: string, round: number, gift: string | null, { spin = true } = {}) => {
    if (spin) await button(page, 'Spin').click();
    await expect(page.getByText(`Round ${round}`, { exact: true })).toBeVisible();
    await expect(shownName(page, name)).toBeVisible();
    if (gift) {
      await expect(page.getByText(gift, { exact: true })).toBeVisible();
      await expect(button(page, 'That was the last one')).toHaveCount(0);
    } else {
      await expect(page.getByText(/^Gift \d+ of \d+$/)).toHaveCount(0);
      await expect(button(page, 'That was the last one')).toBeVisible();
    }
  };

  await test.step('round 1', async () => {
    await turn(first, 1, 'Gift 1 of 3');
    await button(page, 'Next').click();
    await turn(second, 1, null);
    await button(page, 'More to open').click();
    await turn(third, 1, 'Gift 1 of 1');
    await button(page, 'Next').click();
  });

  await test.step('round 2: the third is done, the second says when they are', async () => {
    await turn(first, 2, 'Gift 2 of 3');
    await button(page, 'Next').click();
    await turn(second, 2, null);
    await button(page, 'That was the last one').click();
  });

  await test.step('round 3: only the first is left, no spin', async () => {
    await turn(first, 3, 'Gift 3 of 3', { spin: false });
    await button(page, 'Next').click();
    await expect(page.getByRole('heading', { name: "That's everyone!" })).toBeVisible();
  });
});

test("a member can't open the presenter", async ({ page, signIn, signInPage, db }) => {
  const people = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const giftDay = await giftDayGroup(db, people, 'Not yours', { mode: 'allAtOnce', counts: [null, null, null], reveal: false });
  await signInPage(page, people[1]);
  await page.goto(`/g/${giftDay.slug}`);
  await expect(page.getByRole('heading', { level: 2, name: "It's gift day!" })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open the presenter view' })).toHaveCount(0);
  await page.goto(`/g/${giftDay.slug}/present`);
  await expect(page.getByText('Only the organizer can open the presenter view.')).toBeVisible();
  await expect(button(page, 'Spin')).toHaveCount(0);
});

test('reduced motion: the presenter still shows every name and pair', async ({ page, signIn, signInPage, db }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const people = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const giftDay = await giftDayGroup(db, people, 'Calm', { mode: 'allAtOnce', counts: [null, null, null], reveal: true });
  const [first, second, third] = giftDay.names;
  await signInPage(page, people[0]);
  await openPresenter(page, giftDay.slug);
  await button(page, 'Next').click();

  for (const [i, name] of [first, second, third].entries()) {
    // The spin (not skipped) lands straight away; nobody needs to spin for the last one.
    if (i < 2) await button(page, 'Spin').click();
    await expect(page.getByText(`${i + 1} of 3`, { exact: true })).toBeVisible();
    await expect(shownName(page, name)).toHaveCSS('opacity', '1');
    await button(page, 'Next').click();
  }
  await button(page, 'Reveal who was whose Santa').click();
  const pairs = page.getByRole('list', { name: 'Who was whose Santa' }).getByRole('listitem');
  await expect(pairs).toHaveCount(3);
  for (const pair of giftDay.pairs) await expect(pairs.filter({ hasText: pair })).toHaveCSS('opacity', '1');
});
