// Query parameters that only track the click (ads, newsletters, affiliates, shop analytics).
const TRACKING_PARAMS = new Set([
  'fbclid',
  'gclid',
  'gclsrc',
  'dclid',
  'gbraid',
  'wbraid',
  'msclkid',
  'yclid',
  'twclid',
  'ttclid',
  'igshid',
  'srsltid',
  'mc_cid',
  'mc_eid',
  '_hsenc',
  '_hsmi',
  'mkt_tok',
  'ref',
  'ref_',
  'referrer',
  'cmpid',
  'bltg',
  'bltgh',
  'click_key',
  'click_sum',
  'organic_search_click',
]);

const isTracking = (name: string) => {
  const key = name.toLowerCase();
  return TRACKING_PARAMS.has(key) || /^(utm_|pd_rd_|pf_rd_|_ga|_gl$)/.test(key);
};

/**
 * The URL we store for a wish (39): tracking parameters and the fragment removed. Amazon
 * product links collapse to `/dp/<ASIN>`.
 */
export const cleanProductUrl = (raw: string): string => {
  const url = new URL(raw);
  url.hash = '';
  const asin = url.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?:[/?]|$)/i)?.[1];
  if (/(^|\.)amazon\.[a-z.]+$/i.test(url.hostname) && asin) {
    return `${url.protocol}//${url.host}/dp/${asin.toUpperCase()}`;
  }
  url.pathname = url.pathname.replace(/\/ref=[^/]*$/i, '');
  for (const name of [...url.searchParams.keys()]) {
    if (isTracking(name)) url.searchParams.delete(name);
  }
  return url.toString();
};

const decodeSegment = (segment: string) => {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

/**
 * A guess at the product name from the URL's slug ("…/p/lego-creator-vuurtoren/9300…/" →
 * "Lego creator vuurtoren"), for pages a shop won't let us read (73). Shop ids at the end of
 * the slug are dropped: long numbers, Zalando's "ni112o0bt-a11".
 */
export const titleFromUrl = (raw: string): string | undefined => {
  const slugs = new URL(raw).pathname
    .split('/')
    .map((segment) => decodeSegment(segment).replace(/\.(html?|php|aspx?)$/i, ''))
    .filter((segment) => /[-_]/.test(segment) && (segment.match(/\p{L}{2,}/gu) ?? []).length >= 2);
  const slug = slugs.toSorted((a, b) => b.length - a.length)[0];
  if (!slug) return undefined;
  const words = slug
    .replace(/-[a-z0-9]{9}-[a-z0-9]{3}$/i, '')
    .split(/[-_+\s]+/)
    .filter(Boolean);
  const kept = words.slice(0, words.findLastIndex((word) => !/^\d{6,}$/.test(word)) + 1);
  const title = kept.join(' ').slice(0, 200).trim();
  return title ? title[0].toUpperCase() + title.slice(1) : undefined;
};
