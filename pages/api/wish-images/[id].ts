import type { NextApiRequest, NextApiResponse } from 'next';
import { findWishImage, openWishImage } from '../../../lib/server/import/wish-images';
import { log } from '../../../lib/server/log';

// Imported wish images (39). The random id is the capability: anyone with the URL can load the
// image, like the shop's own image URL. Stored images never change, so they cache for a year.
export default async function wishImageHandler(req: NextApiRequest, res: NextApiResponse) {
  const id = String(req.query.id);
  const file = /^[0-9a-f]{24}$/.test(id) ? await findWishImage(id) : null;
  if (!file) {
    res.status(404).end();
    return;
  }
  res.setHeader('Content-Type', file.metadata.contentType);
  res.setHeader('Content-Length', String(file.length));
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  openWishImage(id)
    .on('error', (error) => {
      log.error({ err: error }, 'wish image stream failed');
      res.destroy();
    })
    .pipe(res);
}
