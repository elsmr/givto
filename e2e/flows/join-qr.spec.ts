// The "Get everyone in" card (61, 72): one link row (copy, QR, share), how many are in, one action. The
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

test('Get everyone in: the link row, how many are in and Draw names; a member sees the count only', async ({ page, newPage, signIn, signInPage }) => {
  const [ann, bob, cee] = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const group = ok(
    await ann.trpc.mutate('group.create', { name: 'Card', organizerName: 'Ann', timeZone: 'Europe/Brussels', exchangeMode: 'inPerson' })
  );
  for (const [person, name] of [[bob, 'Bob'], [cee, 'Cee']] as const) {
    ok(await person.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name }));
  }
  const card = (on: typeof page) => on.locator('[data-slot="card"]').filter({ has: on.getByRole('heading', { name: 'Get everyone in' }) });
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await signInPage(page, ann);
  await page.goto(`/g/${group.slug}`);

  await test.step('organizer: a count instead of names, the link row, one Draw names', async () => {
    await expect(card(page).getByText('3 people are in', { exact: true })).toBeVisible();
    await expect(card(page).getByText('Bob', { exact: true }), 'names are in the People tab').toHaveCount(0);
    await expect(card(page).getByText("Draw names when everyone's in.")).toBeVisible();
    await expect(card(page).getByRole('link', { name: 'Invites and settings' })).toHaveCount(0);
    await expect(card(page).getByRole('button', { name: 'Draw names' })).toHaveCount(1);
    for (const name of ['Copy link', 'Show QR code']) {
      const box = (await card(page).getByRole('button', { name }).boundingBox())!;
      expect(Math.min(box.width, box.height), `${name}: 44px target`).toBeGreaterThanOrEqual(44);
    }
    const link = await card(page).getByLabel('Join link').inputValue();
    await card(page).getByRole('button', { name: 'Copy link' }).click();
    await expect(page.getByText('Link copied')).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(link);
  });

  await test.step('member: the count, no link and no draw', async () => {
    const bobPage = await newPage();
    await signInPage(bobPage, bob);
    await bobPage.goto(`/g/${group.slug}`);
    await expect(card(bobPage).getByText('3 people are in', { exact: true })).toBeVisible();
    await expect(card(bobPage).getByText("The organizer draws the names when everyone's in.")).toBeVisible();
    await expect(card(bobPage).getByLabel('Join link')).toHaveCount(0);
    await expect(card(bobPage).getByRole('button', { name: 'Draw names' })).toHaveCount(0);
  });
});
