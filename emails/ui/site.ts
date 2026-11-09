import { requireEnv } from '../../lib/server/env';
import type { Locale } from '../../lib/schema/common';

/** Absolute app URL for links in emails, in the recipient's language (en has no prefix). */
export const siteUrl = (locale: Locale, path: string): string =>
  `${new URL(requireEnv('BETTER_AUTH_URL')).origin}${locale === 'en' ? '' : `/${locale}`}${path}`;

export const assetUrl = (path: string): string => `${new URL(requireEnv('BETTER_AUTH_URL')).origin}${path}`;
