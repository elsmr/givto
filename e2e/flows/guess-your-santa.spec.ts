// Guess your Santa (62): the guess dialog locks one guess, with the rest of the draw (82); on gift day the room votes on their
// phones (83), then the presenter shows the tally, the Santa and the guess; the group page follows; the organizer can switch it off.
import { expect, ok, test } from '../fixtures';
import { drawnGroup } from '../api/s6-helpers';

test('guess, locked in; phones vote; the presenter shows the tally, then "From … · You guessed …" at the turn', async ({ page, browser, signIn, signInPage, db }) => {
  const people = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const [ann, bob] = people;
  const group = await drawnGroup(people, 'Guessing');
  const at = { groupSlug: group.slug, editionNumber: 1 };
  const { _id: groupId, members } = (await db.groups.findOne({ slug: group.slug }))!;
  const { draw } = (await db.editions.findOne({ groupId, number: 1 }))!;
  const idOf = (userId: string) => members.find((m) => m.userId === userId)!.id;
  const nameOf = (memberId: string) => members.find((m) => m.id === memberId)!.name;
  const santaOf = (memberId: string) => Object.entries(draw!.assignments).find(([, giftee]) => giftee === memberId)![0];
  const bobsSanta = santaOf(idOf(bob.id));
  // Three people: Bob's one board row (82) is the person he doesn't give to, whose Santa is his giftee.
  const bobsGiftee = draw!.assignments[idOf(bob.id)];

  await test.step('Bob makes his guess and it locks', async () => {
    await signInPage(page, bob);
    await page.goto(`/g/${group.slug}`);
    const card = page.getByRole('heading', { name: 'Guess your Santa' });
    await expect(card).toBeVisible();
    await expect(page.getByText("Who's buying your gift? One go, no take-backs.")).toBeVisible();
    await page.getByRole('button', { name: 'Make your guess' }).click();
    const dialog = page.getByRole('dialog', { name: "Who's your Santa?" });
    await expect(dialog.getByRole('radio', { name: 'Bob' })).toHaveCount(0);
    await dialog.getByRole('radio', { name: nameOf(bobsSanta) }).check();
    await expect(dialog.getByText(`${nameOf(bobsGiftee)}'s Santa`)).toBeVisible();
    await dialog.getByRole('combobox', { name: `${nameOf(bobsSanta)}'s Santa` }).selectOption({ label: nameOf(bobsGiftee) });
    await dialog.getByRole('button', { name: 'Lock it in' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText(`You guessed ${nameOf(bobsSanta)}`)).toBeVisible();
    await expect(page.getByText(`${nameOf(bobsSanta)} from ${nameOf(bobsGiftee)}`)).toBeVisible();
    await expect(page.getByText('Locked in', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Make your guess' })).toHaveCount(0);
  });

  ok(await ann.trpc.mutate('manage.startGiftDay', at));
  // Bob unwraps first, so his turn is the one with the guess.
  const order = [idOf(bob.id), ...Object.keys(draw!.assignments).filter((id) => id !== idOf(bob.id))];
  await db.editions.updateOne({ groupId, number: 1 }, { $set: { 'unwrapOrder.memberIds': order } });

  await test.step('the presenter: spin, unwrap, everyone else votes on their phone, the tally, then who it was from', async () => {
    const presenter = await browser.newPage();
    await signInPage(presenter, ann);
    await presenter.goto(`/g/${group.slug}/present`);
    await presenter.getByRole('button', { name: 'Next' }).click();
    await presenter.getByRole('button', { name: 'Presenter settings' }).click();
    await presenter.getByRole('switch', { name: 'Skip the spin' }).click();
    await presenter.keyboard.press('Escape');
    await presenter.getByRole('button', { name: 'Spin' }).click();
    await expect(presenter.getByText('Next to unwrap')).toBeVisible();
    await expect(presenter.getByText(/^From /)).toHaveCount(0);
    await presenter.getByRole('button', { name: 'Start the vote' }).click();
    await expect(presenter.getByText("Vote on your phones: who's it from?")).toBeVisible();
    const phones = await Promise.all(
      [ann, people[2]].map(async (user) => {
        const phone = await browser.newPage();
        await signInPage(phone, user);
        await phone.goto(`/g/${group.slug}`);
        return phone;
      })
    );
    for (const [phone, other] of [[phones[0], 'Cee'], [phones[1], 'Ann']] as const) {
      const vote = phone.getByRole('group', { name: "Who do you think it's from?" });
      await expect(vote.getByRole('button')).toHaveText([other]);
      await vote.getByRole('button', { name: other }).click();
      await expect(vote.getByRole('button', { name: other })).toHaveAttribute('aria-pressed', 'true');
    }
    await expect(presenter.getByRole('list', { name: 'The votes' })).toHaveCount(0);
    await presenter.getByRole('button', { name: 'Close the vote' }).click();
    await expect(presenter.getByRole('list', { name: 'The votes' }).getByRole('listitem')).toHaveText(['Ann1 vote', 'Cee1 vote']);
    await expect(phones[1].getByRole('list', { name: 'The votes' })).toBeVisible();
    await expect(phones[1].getByText('You voted Ann')).toBeVisible();
    await Promise.all(phones.map((phone) => phone.close()));
    await presenter.getByRole('button', { name: 'Who was it from?' }).click();
    await expect(presenter.getByText(`From ${nameOf(bobsSanta)}`)).toBeVisible();
    await expect(presenter.getByText(`You guessed ${nameOf(bobsSanta)}`)).toBeVisible();
    await expect(presenter.getByText('Nailed it!')).toBeVisible();
    await expect(presenter.getByRole('list', { name: 'Leaderboard' }).getByText('1 point')).toBeVisible();
    await expect(presenter.getByRole('button', { name: 'Next' })).toBeVisible();
    await presenter.close();
  });

  await test.step("Bob's page shows his answer", async () => {
    await page.reload();
    await expect(page.getByText(`Your gift was from ${nameOf(bobsSanta)}`)).toBeVisible();
    await expect(page.getByRole('list', { name: 'The votes' })).toBeVisible();
    await expect(page.getByText('Nailed it!').first()).toBeVisible();
    await expect(page.getByText('1 of 1 guessed their Santa')).toBeVisible();
  });

  await test.step('the presenter goes on: the other two turns, each with who it was from, then the end', async () => {
    const presenter = await browser.newPage();
    await signInPage(presenter, ann);
    await presenter.goto(`/g/${group.slug}/present`);
    await presenter.getByRole('button', { name: 'Presenter settings' }).click();
    await presenter.getByRole('switch', { name: 'Skip the spin' }).setChecked(true);
    await presenter.keyboard.press('Escape');
    for (const [i, memberId] of order.entries()) {
      if (i === 0) continue;
      await presenter.getByRole('button', { name: 'Next' }).click();
      // Nobody spins for the last one.
      if (i === 1) await presenter.getByRole('button', { name: 'Spin' }).click();
      await expect(presenter.getByText(`${i + 1} of 3`, { exact: true })).toBeVisible();
      await presenter.getByRole('button', { name: 'Start the vote' }).click();
      await presenter.getByRole('button', { name: 'Close the vote' }).click();
      await expect(presenter.getByText('No votes')).toBeVisible();
      await presenter.getByRole('button', { name: 'Who was it from?' }).click();
      await expect(presenter.getByText(`From ${nameOf(santaOf(memberId))}`)).toBeVisible();
    }
    await presenter.getByRole('button', { name: 'Next' }).click();
    await expect(presenter.getByRole('heading', { name: "That's everyone!" })).toBeVisible();
    // Bob had his own Santa and his one row right (86).
    await expect(presenter.getByText('Champion: Bob')).toBeVisible();
    await presenter.close();
  });
});

test('the organizer switches Guess your Santa off in settings: the card goes', async ({ page, signIn, signInPage }) => {
  const people = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const [ann] = people;
  const group = await drawnGroup(people, 'No guesses');
  await signInPage(page, ann);
  await page.goto(`/g/${group.slug}`);
  await expect(page.getByRole('heading', { name: 'Guess your Santa' })).toBeVisible();
  await page.goto(`/g/${group.slug}/settings#gift-day`);
  const toggle = page.getByRole('switch', { name: 'Guess your Santa' });
  await expect(toggle).toBeChecked();
  await expect(page.getByText(/at each turn everyone votes on their phone/)).toBeVisible();
  await toggle.click();
  await expect(toggle).not.toBeChecked();
  await page.goto(`/g/${group.slug}`);
  await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Guess your Santa' })).toHaveCount(0);
});
