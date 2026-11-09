import { absoluteHttpUrl, cleanText, metaValues, startTags, titleTag } from './html-text';
import { jsonLdImage, jsonLdOffer, jsonLdProduct } from './json-ld';
import { parseAmount, parseCurrency } from './parse-price';

export interface ProductFields {
  title?: string;
  description?: string;
  price?: { currency: string; amount: number; maxAmount?: number };
  imageUrl?: string;
}

const pick = (...values: unknown[]) => values.find((value) => typeof value === 'string' && value.trim());

const MIN_IMAGE_SIDE = 200;

/** Amazon titles carry the store and category: "Name : Amazon.nl: Elektronica". */
const tidyTitle = (title: string | undefined) =>
  title?.replace(/\s*:\s*Amazon\.[a-z.]+(?::.*)?$/i, '').replace(/^Amazon\.[a-z.]+\s*:\s*/i, '') || undefined;

/** Fallback image: Amazon's main product image, else the first `<img>` declared at least 200×200. */
const firstLargeImage = (html: string): string | undefined => {
  for (const image of startTags(html, 'img')) {
    if (image['data-old-hires']) return image['data-old-hires'];
    if (image.id === 'landingImage' && image.src) return image.src;
    if (Number(image.width) >= MIN_IMAGE_SIDE && Number(image.height) >= MIN_IMAGE_SIDE && image.src) return image.src;
  }
  return undefined;
};

const toPrice = (amountValue: unknown, maxValue: unknown, currencyValue: unknown): ProductFields['price'] => {
  const amount = parseAmount(amountValue);
  const currency = parseCurrency(currencyValue);
  if (amount === undefined || !currency) return undefined;
  const maxAmount = parseAmount(maxValue);
  return maxAmount !== undefined && maxAmount > amount ? { currency, amount, maxAmount } : { currency, amount };
};

/**
 * Prefill fields for a wish from a product page (39), per field: JSON-LD Product, then
 * OpenGraph / product / Twitter meta, then `<title>`, meta description and the first large image.
 * `pageUrl` (after redirects) resolves relative image URLs.
 */
export const extractProduct = (html: string, pageUrl: string): ProductFields => {
  const product = jsonLdProduct(html) ?? {};
  const offer = jsonLdOffer(product);
  const meta = metaValues(html);

  const rawTitle = cleanText(pick(product.name, meta.get('og:title'), meta.get('twitter:title'), titleTag(html)), 200);
  const title = tidyTitle(rawTitle);
  const pageDescription = cleanText(
    pick(product.description, meta.get('og:description'), meta.get('twitter:description'), meta.get('description')),
    2000
  );
  // Pages without a description often repeat the title in it.
  const description = pageDescription === rawTitle ? undefined : pageDescription;
  const price =
    (offer && toPrice(offer.amount, offer.maxAmount, offer.currency)) ??
    toPrice(
      meta.get('product:price:amount') ?? meta.get('og:price:amount') ?? meta.get('price'),
      undefined,
      meta.get('product:price:currency') ?? meta.get('og:price:currency') ?? meta.get('pricecurrency')
    );
  const imageUrl = absoluteHttpUrl(
    pick(
      jsonLdImage(product),
      meta.get('og:image:secure_url'),
      meta.get('og:image'),
      meta.get('twitter:image'),
      meta.get('twitter:image:src'),
      firstLargeImage(html)
    ),
    pageUrl
  );
  return Object.fromEntries(
    Object.entries({ title, description, price, imageUrl }).filter(([, value]) => value !== undefined)
  ) as ProductFields;
};
