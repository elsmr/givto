// The "Get everyone in" card (61, 72): who's in as avatars, the invite part; Draw names in the header. The
// join QR code (45) scans: its rendered pixels decode to the join link, light and dark, at phone size.
import { createRequire } from 'node:module';
import { expect, ok, test } from '../fixtures';

const jsQrPath = createRequire(import.meta.url).resolve('jsqr/dist/jsQR.js');

for (const theme of ['light', 'dark'] as const) {
  test(`the join QR code decodes to the join link (${theme})`, async ({ page, signIn, signInPage }) => {
    const ann = await signIn('ann');
    const group = ok(
      await ann.trpc.mutate('group.create', { name: 'Scan me', organizerName: 'Ann', timeZone: 'Europe/Brussels', exchangeMode: 'inPerson' })
    );
    await page.emulateMedia({ colorScheme: theme });
    await signInPage(page, ann);
    await page.goto(`/g/${group.slug}`);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const link = await page.getByLabel('Join link').inputValue();
    await page.getByRole('button', { name: 'Show QR code' }).click();
    const qr = page.getByRole('img', { name: 'QR code with the join link for Scan me' });
    await expect(qr).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length)).toBe(0);

    // CSS pixels: what the code is worth at its on-screen size, not at the device's pixel density.
    const png = await qr.screenshot({ scale: 'css' });
    await page.addScriptTag({ path: jsQrPath });
    const decoded = await page.evaluate(async (base64) => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      [canvas.width, canvas.height] = [image.width, image.height];
      const context = canvas.getContext('2d')!;
      context.drawImage(image, 0, 0);
      const { data, width, height } = context.getImageData(0, 0, image.width, image.height);
      const jsQR = (window as unknown as { jsQR: (d: Uint8ClampedArray, w: number, h: number) => { data: string } | null }).jsQR;
      return { text: jsQR(data, width, height)?.data ?? null, width };
    }, png.toString('base64'));
    expect(decoded.width, 'phone size').toBeLessThanOrEqual(240);
    expect(decoded.text).toBe(link);
  });
}

test('Get everyone in: avatars with names on hover and the invite part; Draw names in the header, disabled with why until enough people; a member waits instead', async ({ page, newPage, signIn, signInPage }) => {
  const [ann, bob, cee] = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const group = ok(
    await ann.trpc.mutate('group.create', { name: 'Card', organizerName: 'Ann', timeZone: 'Europe/Brussels', exchangeMode: 'inPerson' })
  );
  const join = (person: typeof bob, name: string) => person.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name });
  ok(await join(bob, 'Bob'));
  const card = (on: typeof page) => on.locator('[data-slot="card"]').filter({ has: on.getByRole('heading', { name: 'Get everyone in' }) });
  const draw = page.getByRole('button', { name: 'Draw names' });
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await signInPage(page, ann);
  await page.goto(`/g/${group.slug}`);

  await test.step('two people in: Draw names is disabled and says how many more on hover; copying the link is the main action', async () => {
    await expect(card(page).getByRole('button', { name: 'Copy link' })).toHaveText('Copy link');
    await expect(card(page).getByLabel('Invite by email'), 'email invites are in the settings').toHaveCount(0);
    await expect(draw).toBeDisabled();
    await expect(draw).toHaveAccessibleDescription('Drawing names needs 1 more person.');
    await draw.hover({ force: true });
    await expect(page.locator('[data-slot="tooltip-content"]')).toHaveText('Drawing names needs 1 more person.');
    ok(await join(cee, 'Cee'));
    await page.reload();
    await expect(draw).toBeEnabled();
    await expect(card(page).getByRole('button', { name: 'Draw names' }), 'not in the card').toHaveCount(0);
    await expect(card(page).getByRole('button', { name: 'Copy link' }), 'an icon once enough are in').toHaveText('');
  });

  await test.step('organizer: avatars named on hover, the draw rules, the link row', async () => {
    await expect(card(page)).toContainText('Anyone can draw anyone.');
    const avatars = card(page).getByRole('img', { name: '3 people are in: Ann, Bob, and Cee' });
    await expect(avatars).toBeVisible();
    await avatars.locator('[data-slot="avatar"]').nth(1).hover();
    await expect(page.locator('[data-slot="tooltip-content"]')).toHaveText('Bob');
    for (const name of ['Copy link', 'Show QR code']) {
      const box = (await card(page).getByRole('button', { name }).boundingBox())!;
      expect(Math.min(box.width, box.height), `${name}: 44px target`).toBeGreaterThanOrEqual(44);
    }
    const link = await card(page).getByLabel('Join link').inputValue();
    await card(page).getByRole('button', { name: 'Copy link' }).click();
    await expect(page.getByText('Link copied')).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(link);
  });

  await test.step('member: the waiting card with who is in, no link, no rules and no draw', async () => {
    const bobPage = await newPage();
    await signInPage(bobPage, bob);
    await bobPage.goto(`/g/${group.slug}`);
    await expect(bobPage.getByRole('heading', { name: "You're in" })).toBeVisible();
    await expect(card(bobPage)).toHaveCount(0);
    await expect(bobPage.getByRole('img', { name: '3 people are in: Ann, Bob, and Cee' })).toBeVisible();
    await expect(bobPage.getByLabel('Join link')).toHaveCount(0);
    await expect(bobPage.getByText('Anyone can draw anyone.')).toHaveCount(0);
    await expect(bobPage.getByRole('button', { name: 'Draw names' })).toHaveCount(0);
  });
});

test('join link turned off or missing: the card makes a new one', async ({ page, signIn, signInPage, db }) => {
  const ann = await signIn('ann');
  const group = ok(
    await ann.trpc.mutate('group.create', { name: 'Relink', organizerName: 'Ann', timeZone: 'Europe/Brussels', exchangeMode: 'inPerson' })
  );
  await signInPage(page, ann);
  for (const [why, turnOff] of [
    ['turned off', async () => ok(await ann.trpc.mutate('join.revokeLink', { groupSlug: group.slug }))],
    ['missing', () => db.groups.updateOne({ slug: group.slug }, { $unset: { joinLink: '' } })],
  ] as const) {
    await test.step(why, async () => {
      await turnOff();
      await page.goto(`/g/${group.slug}`);
      await expect(page.getByText('The join link is off.')).toBeVisible();
      await page.getByRole('button', { name: 'Make a new link' }).click();
      await expect(page.getByLabel('Join link')).toHaveValue(/\/join\?token=/);
      await expect(page.getByText('The join link is off.')).toHaveCount(0);
    });
  }
});
