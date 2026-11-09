import { cleanProductUrl } from './clean-url';
import { extractProduct, type ProductFields } from './extract-product';
import { safeFetch } from './safe-fetch';
import { sniffImageType, storeWishImage } from './wish-images';

/** Charset from the Content-Type header or a `<meta charset>` near the top; UTF-8 otherwise. */
const decodeHtml = (body: Buffer, contentType: string): string => {
  const head = body.subarray(0, 4096).toString('latin1');
  const label =
    contentType.match(/charset=["']?([\w-]+)/i)?.[1] ?? head.match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1] ?? 'utf-8';
  try {
    return new TextDecoder(label).decode(body);
  } catch {
    return new TextDecoder('utf-8').decode(body);
  }
};

/** Downloads the image under the same SSRF rules; a failed image never fails the import. */
const importImage = async (imageUrl: string, ownerId: string): Promise<string | undefined> => {
  try {
    const image = await safeFetch(imageUrl, 'image');
    const contentType = sniffImageType(image.body);
    return contentType ? await storeWishImage(image.body, contentType, ownerId) : undefined;
  } catch {
    return undefined;
  }
};

export type ImportedProduct = Omit<ProductFields, 'imageUrl'> & { url: string; imageId?: string };

/** Fetches a product page and prefills a wish (39). Throws ImportError when the page can't be read. */
export const importProduct = async (rawUrl: string, ownerId: string): Promise<ImportedProduct> => {
  const page = await safeFetch(rawUrl, 'page');
  const { imageUrl, ...fields } = extractProduct(decodeHtml(page.body, page.contentType), page.url);
  const imageId = imageUrl ? await importImage(imageUrl, ownerId) : undefined;
  return { url: cleanProductUrl(page.url), ...fields, ...(imageId && { imageId }) };
};
