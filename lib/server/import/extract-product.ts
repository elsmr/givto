import { absoluteHttpUrl, cleanText, elementById, metaValues, microdataProduct, startTags, titleTag } from './html-text';
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

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** "amazon" for www.amazon.co.uk, "bol" for bol.com. */
const shopName = (pageUrl: string) => {
  const labels = new URL(pageUrl).hostname.replace(/^www\./, '').split('.');
  return labels.length > 2 && /^(co|com|org|net)$/.test(labels.at(-2)!) ? labels.at(-3)! : labels.at(-2) ?? labels[0];
};

/**
 * The product name without the shop around it: "Name | Coolblue | Tablets", "Name - IKEA",
 * "Name : Amazon.nl: Elektronica", "Amazon.com: Name" all become "Name".
 */
const tidyTitle = (title: string | undefined, pageUrl: string) => {
  if (!title) return undefined;
  const shop = escapeRegExp(shopName(pageUrl));
  const tidied = title
    .replace(new RegExp(`(?:\\s+[-–—|·•:]\\s*|\\s*[|:]\\s+)${shop}\\b.*$`, 'i'), '')
    .replace(new RegExp(`^${shop}(?:\\.[a-z.]+)?\\s*:\\s*`, 'i'), '');
  return tidied || title;
};

/** Fallback image: Amazon's main product image, else the first `<img>` declared at least 200×200. */
const firstLargeImage = (html: string): string | undefined => {
  for (const image of startTags(html, 'img')) {
    if (image['data-old-hires']) return image['data-old-hires'];
    if (image.id === 'landingImage' && image.src) return image.src;
    if (Number(image.width) >= MIN_IMAGE_SIDE && Number(image.height) >= MIN_IMAGE_SIDE && image.src) return image.src;
  }
  return undefined;
};

/** Amazon has no JSON-LD or price meta: the title element and the buy box's hidden price fields. */
const amazonFields = (html: string, pageUrl: string) => {
  if (!/(^|\.)amazon\.[a-z.]+$/i.test(new URL(pageUrl).hostname)) return {};
  const inputs = new Map(startTags(html, 'input').map((input) => [input.name, input.value]));
  return {
    title: elementById(html, 'span', 'productTitle'),
    amount: inputs.get('items[0.base][customerVisiblePrice][amount]'),
    currency: inputs.get('items[0.base][customerVisiblePrice][currencyCode]'),
  };
};

const toPrice = (amountValue: unknown, maxValue: unknown, currencyValue: unknown): ProductFields['price'] => {
  const amount = parseAmount(amountValue);
  const currency = parseCurrency(currencyValue);
  if (amount === undefined || !currency) return undefined;
  const maxAmount = parseAmount(maxValue);
  return maxAmount !== undefined && maxAmount > amount ? { currency, amount, maxAmount } : { currency, amount };
};

/**
 * Prefill fields for a wish from a product page (39, 73), per field: JSON-LD Product, then
 * OpenGraph / product / Twitter meta, then microdata, then what we know of a shop's markup
 * (Amazon), then `<title>`, meta description and the first large image. `pageUrl` (after
 * redirects) resolves relative image URLs and names the shop to drop from titles.
 */
export const extractProduct = (html: string, pageUrl: string): ProductFields => {
  const product = jsonLdProduct(html) ?? {};
  const offer = jsonLdOffer(product);
  const meta = metaValues(html);
  const micro = microdataProduct(html);
  const shop = amazonFields(html, pageUrl);

  const rawTitle = cleanText(
    pick(product.name, meta.get('og:title'), meta.get('twitter:title'), micro.get('name'), shop.title, titleTag(html)),
    200
  );
  const title = tidyTitle(rawTitle, pageUrl);
  const pageDescription = cleanText(
    pick(
      product.description,
      meta.get('og:description'),
      meta.get('twitter:description'),
      micro.get('description'),
      meta.get('description')
    ),
    2000
  );
  // Pages without a description often repeat the title in it.
  const description = tidyTitle(pageDescription, pageUrl) === title ? undefined : pageDescription;
  const price =
    (offer && toPrice(offer.amount, offer.maxAmount, offer.currency)) ??
    toPrice(
      meta.get('product:price:amount') ?? meta.get('og:price:amount'),
      undefined,
      meta.get('product:price:currency') ?? meta.get('og:price:currency')
    ) ??
    toPrice(micro.get('price') ?? micro.get('lowprice'), micro.get('highprice'), micro.get('pricecurrency')) ??
    toPrice(meta.get('price'), undefined, meta.get('pricecurrency')) ??
    toPrice(shop.amount, undefined, shop.currency);
  const imageUrl = absoluteHttpUrl(
    pick(
      jsonLdImage(product),
      meta.get('og:image:secure_url'),
      meta.get('og:image'),
      meta.get('twitter:image'),
      meta.get('twitter:image:src'),
      micro.get('image'),
      firstLargeImage(html)
    ),
    pageUrl
  );
  return Object.fromEntries(
    Object.entries({ title, description, price, imageUrl }).filter(([, value]) => value !== undefined)
  ) as ProductFields;
};
