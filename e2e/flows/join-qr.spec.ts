// The join QR code (45) scans: its rendered pixels decode to the join link, light and dark, at the
// size a phone shows it.
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
