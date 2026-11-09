// Small, regex-based helpers for reading product pages. We only pull strings out of the
// HTML; nothing fetched is ever rendered as HTML (39, 03 XSS).

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  euro: '€',
  pound: '£',
  copy: '©',
  reg: '®',
  trade: '™',
  hellip: '…',
  ndash: '–',
  mdash: '—',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
};

const fromCodePoint = (code: number) => {
  try {
    return String.fromCodePoint(code);
  } catch {
    return '';
  }
};

export const decodeEntities = (text: string): string =>
  text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const hex = entity[1] === 'x' || entity[1] === 'X';
      return fromCodePoint(parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10));
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });

/** Plain text: tags dropped, entities decoded, whitespace and control characters collapsed, capped. */
export const cleanText = (value: unknown, max: number): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const text = decodeEntities(value.replace(/<[^>]*>/g, ' '))
    .replace(/<[^>]*>/g, ' ')
    // Some shops over-escape punctuation in JSON-LD ("beschadigingen\\, zodat").
    .replace(/\\(?=[,.;:!?])/g, '')
    .replace(/[\s\u0000-\u001f\u007f]+/g, ' ')
    .trim();
  if (!text) return undefined;
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
};

/** Attributes of one start tag, names lower-cased, values decoded. */
export const tagAttributes = (tag: string): Record<string, string> => {
  const attributes: Record<string, string> = {};
  const inner = tag.replace(/^<[a-z0-9]+/i, '').replace(/\/?>$/, '');
  for (const [, name, double, single, bare] of inner.matchAll(/([^\s=/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    const key = name.toLowerCase();
    if (!(key in attributes)) attributes[key] = decodeEntities(double ?? single ?? bare ?? '');
  }
  return attributes;
};

/** Every `<tagName …>` start tag's attributes, in document order. */
export const startTags = (html: string, tagName: string): Record<string, string>[] =>
  [...html.matchAll(new RegExp(`<${tagName}\\b[^>]*>`, 'gi'))].map(([tag]) => tagAttributes(tag));

/** `<meta>` values by property / name / itemprop (lower-cased); the first one wins. */
export const metaValues = (html: string): Map<string, string> => {
  const values = new Map<string, string>();
  for (const meta of startTags(html, 'meta')) {
    const key = (meta.property ?? meta.name ?? meta.itemprop)?.toLowerCase();
    if (key && meta.content && !values.has(key)) values.set(key, meta.content);
  }
  return values;
};

export const titleTag = (html: string): string | undefined => html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];

/** An absolute http(s) URL resolved against the page, or nothing. */
export const absoluteHttpUrl = (value: unknown, base: string): string | undefined => {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  try {
    const url = new URL(decodeEntities(value.trim()), base);
    return /^https?:$/.test(url.protocol) && url.href.length <= 2000 ? url.href : undefined;
  } catch {
    return undefined;
  }
};
