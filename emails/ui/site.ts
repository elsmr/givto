import { requireEnv } from '../../lib/server/env';
import type { Locale } from '../../lib/schema/common';

export const assetUrl = (path: string): string => `${new URL(requireEnv('BETTER_AUTH_URL')).origin}${path}`;

/**
 * Absolute URL for links in emails. Only the home page (`''`) carries the recipient's language;
 * app pages pick it themselves (81).
 */
export const siteUrl = (locale: Locale, path: string): string =>
  assetUrl(path === '' && locale !== 'en' ? `/${locale}` : path);
