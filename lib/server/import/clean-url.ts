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
