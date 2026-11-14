// Guess your Santa (62, 94): the dialog sets a guess per giftee (82) and changes it; on gift day phones guess at the turn
// on /live (95) until the Santa is shown; the presenter shows the Santa, the guess and everyone's tally; the group page
// follows; the organizer can switch it off.
import { expect, ok, test } from '../fixtures';
import { drawnGroup } from '../api/s6-helpers';

test('guess and change it; phones guess at the turn; the presenter shows "From … · You guessed …" and the tally', async ({ page, browser, signIn, signInPage, db }) => {
  // Walks the presenter step by step: too slow for the default timeout on a busy machine.
  test.slow();
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
  // Three people: Bob's other row is the person he doesn't give to, whose Santa is his giftee.
  const bobsGiftee = draw!.assignments[idOf(bob.id)];

  await test.step('Bob guesses, then changes his mind', async () => {
    await signInPage(page, bob);
    await page.goto(`/g/${group.slug}`);
    await expect(page.getByRole('heading', { name: 'Guess your Santa' })).toBeVisible();
    await expect(page.getByText("Who's buying your gift? You can change your guesses until the Santas are shown.")).toBeVisible();
    await page.getByRole('button', { name: 'Make your guess' }).click();
    const dialog = page.getByRole('dialog', { name: "Who's whose Santa?" });
    await expect(dialog.getByRole('combobox', { name: 'Your Santa' }).getByRole('option', { name: 'Bob' })).toHaveCount(0);
    await dialog.getByRole('combobox', { name: 'Your Santa' }).selectOption({ label: nameOf(bobsGiftee) });
    await expect(dialog.getByText(`${nameOf(bobsGiftee)}'s Santa`)).toBeVisible();
    await dialog.getByRole('combobox', { name: `${nameOf(bobsSanta)}'s Santa` }).selectOption({ label: nameOf(bobsGiftee) });
    await dialog.getByRole('button', { name: 'Save guesses' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText(/You guessed/)).toHaveCount(0);
    await page.getByRole('button', { name: 'Change your guesses' }).click();
    await expect(dialog.getByRole('combobox', { name: 'Your Santa' }).locator('option:checked')).toHaveText(nameOf(bobsGiftee));
    await expect(dialog.getByRole('combobox', { name: `${nameOf(bobsSanta)}'s Santa` }).locator('option:checked')).toHaveText(nameOf(bobsGiftee));
    await dialog.getByRole('combobox', { name: 'Your Santa' }).selectOption({ label: nameOf(bobsSanta) });
    await dialog.getByRole('button', { name: 'Save guesses' }).click();
    await expect(dialog).toBeHidden();
    await page.getByRole('button', { name: 'Change your guesses' }).click();
    await expect(dialog.getByRole('combobox', { name: 'Your Santa' }).locator('option:checked')).toHaveText(nameOf(bobsSanta));
    await dialog.getByRole('button', { name: 'Not yet' }).click();
  });

  ok(await ann.trpc.mutate('manage.startGiftDay', at));
  // Bob unwraps first, so his turn is the one with the guess.
  const order = [idOf(bob.id), ...Object.keys(draw!.assignments).filter((id) => id !== idOf(bob.id))];
  await db.editions.updateOne({ groupId, number: 1 }, { $set: { 'unwrapOrder.memberIds': order } });

  await test.step('the presenter: spin, unwrap, phones guess, then who it was from with the tally', async () => {
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
    await expect(presenter.getByText("Guess on your phones: who's it from?")).toBeVisible();
    const phone = await browser.newPage();
    const giftee = people.find((user) => idOf(user.id) === bobsGiftee)!;
    const santa = people.find((user) => idOf(user.id) === bobsSanta)!;
    await signInPage(phone, giftee);
    await phone.goto(`/g/${group.slug}/live`);
    const picker = phone.getByRole('group', { name: "Who do you think it's from?" });
    await expect(picker.getByRole('button')).toHaveText([nameOf(bobsSanta)]);
    await picker.getByRole('button', { name: nameOf(bobsSanta) }).click();
    await expect(picker.getByRole('button', { name: nameOf(bobsSanta) })).toHaveAttribute('aria-pressed', 'true');
    // Bob's own row, as he saved it.
    await page.goto(`/g/${group.slug}/live`);
    await expect(page.getByRole('group', { name: "Who do you think it's from?" }).getByRole('button', { name: nameOf(bobsSanta) })).toHaveAttribute('aria-pressed', 'true');
    const santaPhone = await browser.newPage();
    await signInPage(santaPhone, santa);
    await santaPhone.goto(`/g/${group.slug}/live`);
    await expect(santaPhone.getByText(`Now unwrapping: ${nameOf(idOf(bob.id))}`)).toBeVisible();
    await expect(santaPhone.getByRole('group', { name: "Who do you think it's from?" }), 'their Santa').toHaveCount(0);
    await santaPhone.close();
    await expect(presenter.getByRole('list', { name: "Everyone's guesses" })).toHaveCount(0);
    await presenter.getByRole('button', { name: 'Who was it from?' }).click();
    await expect(presenter.getByText(`From ${nameOf(bobsSanta)}`)).toBeVisible();
    await expect(presenter.getByText(`You guessed ${nameOf(bobsSanta)}`)).toBeVisible();
    await expect(presenter.getByText('Nailed it!')).toBeVisible();
    await expect(presenter.getByRole('list', { name: "Everyone's guesses" }).getByRole('listitem')).toHaveText([`${nameOf(bobsSanta)}2 guesses`]);
    await expect(presenter.getByRole('list', { name: 'Leaderboard' }).getByText('1 point')).toHaveCount(2);
    await expect(phone.getByRole('list', { name: "Everyone's guesses" })).toBeVisible();
    await expect(phone.getByText(`You guessed ${nameOf(bobsSanta)}`)).toBeVisible();
    await phone.close();
    await expect(presenter.getByRole('button', { name: 'Next' })).toBeVisible();
    await presenter.close();
  });

  await test.step("Bob's page shows his answer", async () => {
    await page.goto(`/g/${group.slug}`);
    await expect(page.getByText(`Your gift was from ${nameOf(bobsSanta)}`)).toBeVisible();
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
      await presenter.getByRole('button', { name: 'Who was it from?' }).click();
      await expect(presenter.getByText(`From ${nameOf(santaOf(memberId))}`)).toBeVisible();
    }
    await presenter.getByRole('button', { name: 'Next' }).click();
    await expect(presenter.getByRole('heading', { name: "That's everyone!" })).toBeVisible();
    // Bob had his own Santa and his other row right (86).
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
  await expect(page.getByText(/Everyone guesses who's whose Santa/)).toBeVisible();
  await toggle.click();
  await expect(toggle).not.toBeChecked();
  await page.goto(`/g/${group.slug}`);
  await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Guess your Santa' })).toHaveCount(0);
});
