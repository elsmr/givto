// Gift day (31, 32, 63, 69): the presenter for the organizer: intro, spin (or skip it), turns with
// gift counts all at once and one by one ("Gift 2 of 3", the manual fallback), the big reveal one
// pair at a time; members can't open it but follow it on /live (95); reduced motion still shows everything.
import type { Locator, Page } from '@playwright/test';
import type { UnwrapMode } from '@/lib/schema/edition';
import { expect, ok, test, type TestDb, type User } from '../fixtures';
import { drawnGroup } from '../api/s6-helpers';
import { drawOf } from './draw-seed';

/**
 * Ann, Bob and Cee on gift day with a shuffled unwrap order. `counts[i]`: how many gifts the i-th
 * person in the unwrap order gets, as their Santa marked them; null: their Santa marked nothing.
 * Guess your Santa is off unless `guessing`: guess-your-santa.spec.ts walks the presenter with it on.
 */
const giftDayGroup = async (
  db: TestDb,
  people: User[],
  name: string,
  { mode, counts, reveal, guessing = false }: { mode: UnwrapMode; counts: (number | null)[]; reveal: boolean; guessing?: boolean }
) => {
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
  await db.editions.updateOne({ _id: draw.editionId }, { $set: { status: 'giftday', guessing } });
  const pairs = people.map((person) => `${draw.nameOf(person)} got a gift from ${draw.nameOf(draw.santaOf(person))}`);
  return {
    slug: group.slug,
    names: order.map((person) => person.name),
    countOf: (user: User) => counts[order.findIndex((p) => p.memberId === draw.memberIdOf(user))],
    santaOfNth: (i: number) => draw.santaOf(userOf(order[i].memberId)),
    pairs,
  };
};

/** Names on the stage are paragraphs; the spinning reel's strip is aria-hidden, so it never matches. */
const shownName = (page: Page, name: string) => page.getByRole('paragraph').filter({ hasText: new RegExp(`^${name}$`) });
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const liveQr = (scope: Page | Locator) => scope.getByRole('img', { name: 'QR code to follow along on your phone' });

/** From the group page's gift day card to the presenter's intro, with the QR for /live (96). */
const openPresenter = async (page: Page, slug: string) => {
  await page.goto(`/g/${slug}`);
  await expect(page.getByRole('heading', { level: 2, name: "It's gift day!" })).toBeVisible();
  await page.getByRole('link', { name: 'Open the presenter view' }).click();
  await expect(page).toHaveURL(`/g/${slug}/present`);
  await expect(page.getByText('Press → or space for the first person.')).toBeVisible();
  await expect(button(page, 'Previous')).toBeDisabled();
  await expect(liveQr(page)).toBeVisible();
  await expect(page.getByText(new RegExp(`^https?://[^/]+/g/${slug}/live$`))).toBeVisible();
};

const skipSpin = async (page: Page) => {
  await button(page, 'Presenter settings').click();
  await page.getByRole('switch', { name: 'Skip the spin' }).click();
  await page.keyboard.press('Escape');
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
  // Walks the presenter step by step: too slow for the default timeout on a busy machine.
  test.slow();
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
    await button(page, 'Follow along on your phone').click();
    const qrDialog = page.getByRole('dialog', { name: 'Follow along on your phone' });
    await expect(liveQr(qrDialog)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(qrDialog).toHaveCount(0);
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
    await button(page, 'Presenter settings').click();
    await page.getByRole('switch', { name: 'Skip the spin' }).click();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Escape');
    await expect(button(page, 'Spin'), 'keys in the settings stay in the settings').toBeVisible();
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
    await bobPage.getByRole('link', { name: 'Join the presentation' }).click();
    await expect(bobPage).toHaveURL(`/g/${giftDay.slug}/live`);
    await expect(bobPage.getByText(`Now unwrapping: ${third}`)).toBeVisible();
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

test('/live: a member follows the presenter, guesses at the turn, and their guess is in the tally', async ({ page, newPage, signIn, signInPage, db }) => {
  const people = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const giftDay = await giftDayGroup(db, people, 'Live', { mode: 'allAtOnce', counts: [null, null, null], reveal: false, guessing: true });
  const [first] = giftDay.names;
  // The first person's Santa has nothing to guess at their turn.
  const member = people.slice(1).find((user) => user !== giftDay.santaOfNth(0))!;
  const live = await newPage();
  await signInPage(live, member);
  await live.goto(`/g/${giftDay.slug}/live`);
  await expect(live.getByText('Waiting for the presenter…')).toBeVisible();

  await signInPage(page, people[0]);
  await openPresenter(page, giftDay.slug);
  await skipSpin(page);
  await button(page, 'Next').click();
  await expect(live.getByText("Who's next? The reel is spinning…")).toBeVisible();
  await button(page, 'Spin').click();
  await expect(shownName(page, first)).toBeVisible();
  await expect(live.getByText(`Now unwrapping: ${first}`)).toBeVisible();

  const pick = live.getByRole('group', { name: "Who do you think it's from?" }).getByRole('button').first();
  const guess = (await pick.textContent())!;
  await pick.click();
  await expect(pick).toHaveAttribute('aria-pressed', 'true');
  await button(page, 'Who was it from?').click();
  await expect(live.getByRole('list', { name: "Everyone's guesses" }).getByRole('listitem')).toHaveText([`${guess}1 guess`]);
  await expect(live.getByText(`You guessed ${guess}`)).toBeVisible();
});

test('presenter, one by one: "Gift 2 of 3", and "That was the last one" when nobody counted', async ({ page, signIn, signInPage, db }) => {
  // Walks the presenter step by step: too slow for the default timeout on a busy machine.
  test.slow();
  const people = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  // First in the order 3 gifts, second unknown (their Santa marked nothing), third 1.
  const giftDay = await giftDayGroup(db, people, 'Rounds', { mode: 'oneByOne', counts: [3, null, 1], reveal: false });
  const [first, second, third] = giftDay.names;
  await signInPage(page, people[0]);
  await openPresenter(page, giftDay.slug);
  await skipSpin(page);
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

test('presenter settings: changing how you unwrap mid-way asks first, then starts over; close goes back', async ({ page, signIn, signInPage, db }) => {
  const people = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const giftDay = await giftDayGroup(db, people, 'Switch', { mode: 'allAtOnce', counts: [null, null, null], reveal: false });
  await signInPage(page, people[0]);
  await openPresenter(page, giftDay.slug);
  await skipSpin(page);
  await button(page, 'Next').click();
  await button(page, 'Spin').click();
  await expect(page.getByText('Next to unwrap')).toBeVisible();

  await button(page, 'Presenter settings').click();
  const mode = page.getByLabel('How do you unwrap?');
  await mode.selectOption('One by one');
  await button(page, 'Keep going').click();
  await expect(mode).toHaveValue('allAtOnce');
  await mode.selectOption('One by one');
  await button(page, 'Change and start over').click();
  await expect(page.getByRole('dialog', { name: 'Change how you unwrap?' })).toHaveCount(0);
  await expect(mode).toHaveValue('oneByOne');
  await page.keyboard.press('Escape');
  await expect(page.getByText('Press → or space for the first person.')).toBeVisible();

  await page.getByRole('link', { name: 'Close the presenter view' }).click();
  await expect(page).toHaveURL(`/g/${giftDay.slug}`);
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

test('white elephant: create, lock in, and a four-person swap with two steals in the presenter', async ({ page, signIn, signInPage }) => {
  // Walks the presenter step by step: too slow for the default timeout on a busy machine.
  test.slow();
  const [ann, bob, cee, dan] = await Promise.all(['ann', 'bob', 'cee', 'dan'].map((name) => signIn(name)));
  await signInPage(page, ann);

  await test.step('create: no posting question', async () => {
    await page.goto('/new');
    await page.getByRole('radio', { name: 'White elephant' }).check();
    await page.getByLabel("What's your white elephant called?").fill('Swap');
    await expect(page.getByRole('button', { name: 'Sending gifts by post?' })).toHaveCount(0);
    await page.getByLabel("When's gift day?").fill('2099-12-24');
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByLabel('Your name').fill('Ann');
    await page.getByRole('button', { name: 'Create white elephant' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Swap is ready!' })).toBeVisible();
  });
  const link = new URL(await page.getByLabel('Join link').inputValue());
  const slug = link.pathname.split('/')[2];
  const at = { groupSlug: slug, editionNumber: 1 };
  for (const [user, name] of [[bob, 'Bob'], [cee, 'Cee'], [dan, 'Dan']] as const) {
    ok(await user.trpc.mutate('join.accept', { groupSlug: slug, token: link.searchParams.get('token')!, name }));
  }

  await test.step('lock in: no giftee or wishlist, nothing to shop for', async () => {
    await page.goto(`/g/${slug}`);
    await expect(page.getByRole('list', { name: 'Where this Secret Santa is' }).getByText('Lock in')).toBeVisible();
    await expect(page.getByRole('tab', { name: /wishlist/i })).toHaveCount(0);
    await button(page, 'Lock in').click();
    await expect(page.getByRole('dialog', { name: 'Lock it in now?' })).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Lock in' }).click();
    await expect(page.getByText('Locked in!')).toBeVisible();
    await expect(page.getByRole('heading', { name: "It's locked in" })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'My giftee' })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: /wishlist/i })).toHaveCount(0);
  });

  await test.step('the swap: open, steal (and undo it), the person robbed goes again, the final steal', async () => {
    ok(await ann.trpc.mutate('manage.startGiftDay', at));
    const [p0, p1, p2, p3] = ok(await ann.trpc.query('giftday.presenter', at)).unwrapOrder!.people.map((p) => p.name);
    const table = page.getByRole('list', { name: 'Who has which gift' });
    await openPresenter(page, slug);
    await skipSpin(page);
    await button(page, 'Next').click();
    await button(page, 'Spin').click();
    await expect(shownName(page, p0)).toBeVisible();
    await expect(page.getByText('Open a wrapped gift.', { exact: true })).toBeVisible();
    await page.getByLabel("What's in it? (optional)").fill('Red scarf');
    await button(page, 'Opened a new gift').click();

    await button(page, 'Spin').click();
    await expect(shownName(page, p1)).toBeVisible();
    await expect(table.getByText('Red scarf')).toBeVisible();
    await button(page, `Steal gift 1 from ${p0}`).click();
    await expect(page.getByText('Stolen from! Your turn again')).toBeVisible();
    await expect(shownName(page, p0)).toBeVisible();
    await button(page, 'Previous').click();
    await expect(shownName(page, p1)).toBeVisible();
    await button(page, `Steal gift 1 from ${p0}`).click();
    await expect(shownName(page, p0)).toBeVisible();
    await expect(page.getByRole('button', { name: /^Steal gift/ })).toHaveCount(0);
    await button(page, 'Opened a new gift').click();

    await button(page, 'Spin').click();
    await expect(shownName(page, p2)).toBeVisible();
    await button(page, 'Opened a new gift').click();
    // The last one in the order: no spin.
    await expect(shownName(page, p3)).toBeVisible();
    await button(page, `Steal gift 2 from ${p0}`).click();
    await expect(page.getByText('Stolen from! Your turn again')).toBeVisible();
    await button(page, 'Opened a new gift').click();

    await expect(page.getByText('Final steal', { exact: true })).toBeVisible();
    // Their name on the stage, and again on the table with the gift they hold.
    await expect(shownName(page, p0)).toHaveCount(2);
    await button(page, 'Keep their gift').click();
    await expect(page.getByRole('heading', { name: "That's everyone!" })).toBeVisible();
    await expect(table.getByRole('listitem')).toHaveText([
      `Gift 1Red scarf${p1}Stolen once`,
      `Gift 2${p3}Stolen once`,
      `Gift 3${p2}Not stolen yet`,
      `Gift 4${p0}Not stolen yet`,
    ]);
  });
});
