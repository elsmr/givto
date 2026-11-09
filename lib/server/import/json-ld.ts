type JsonObject = Record<string, unknown>;

const isObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const first = (value: unknown): unknown => (Array.isArray(value) ? value[0] : value);

const isProduct = (node: JsonObject) => {
  const types = [node['@type']].flat();
  return types.some((type) => type === 'Product' || type === 'ProductGroup');
};

/** Depth-first search for the first schema.org Product, through arrays, @graph and nested values. */
const findProduct = (node: unknown, depth = 0): JsonObject | undefined => {
  if (depth > 8) return undefined;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findProduct(item, depth + 1);
      if (found) return found;
    }
    return undefined;
  }
  if (!isObject(node)) return undefined;
  if (isProduct(node)) return node;
  for (const value of Object.values(node)) {
    const found = findProduct(value, depth + 1);
    if (found) return found;
  }
  return undefined;
};

/** The first Product in the page's `<script type="application/ld+json">` blocks. Broken JSON is skipped. */
export const jsonLdProduct = (html: string): JsonObject | undefined => {
  const scripts = html.matchAll(/<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi);
  for (const [, content] of scripts) {
    try {
      const product = findProduct(JSON.parse(content.trim()));
      if (product) return product;
    } catch {
      // Shops ship invalid JSON-LD now and then; try the next block.
    }
  }
  return undefined;
};

export interface JsonLdOffer {
  amount?: unknown;
  maxAmount?: unknown;
  currency?: unknown;
}

/** Price fields of the first Offer / AggregateOffer (also inside a ProductGroup's variants). */
export const jsonLdOffer = (product: JsonObject): JsonLdOffer | undefined => {
  const offer = first(product.offers) ?? first((first(product.hasVariant) as JsonObject | undefined)?.offers);
  if (!isObject(offer)) return undefined;
  if (offer.lowPrice !== undefined) {
    return { amount: offer.lowPrice, maxAmount: offer.highPrice, currency: offer.priceCurrency };
  }
  const specification = first(offer.priceSpecification);
  const spec = isObject(specification) ? specification : {};
  return { amount: offer.price ?? spec.price, currency: offer.priceCurrency ?? spec.priceCurrency };
};

/** A Product's image as a URL string: a string, the first of a list, or an ImageObject. */
export const jsonLdImage = (product: JsonObject): unknown => {
  const image = first(product.image);
  return isObject(image) ? (image.url ?? image.contentUrl ?? image.contentURL) : image;
};
