import { createHmac, timingSafeEqual } from 'node:crypto';
import { assetUrl, siteUrl } from '../../../emails/ui/site';
import { unsubscribeCategories, type UnsubscribeCategory } from '../../../emails/ui/categories';
import type { Locale } from '../../schema/common';
import { requireEnv } from '../env';

// Unsubscribe links work without signing in (29, 54): `<userId>.<category>.<signature>`, an
// HMAC under a key derived from the auth secret. They never expire; the worst a leaked link
// can do is turn one email category off for one person.
const sign = (payload: string) =>
  createHmac('sha256', createHmac('sha256', requireEnv('BETTER_AUTH_SECRET')).update('givto:unsubscribe').digest())
    .update(payload)
    .digest('base64url');

export const unsubscribeToken = (userId: string, category: UnsubscribeCategory): string =>
  `${userId}.${category}.${sign(`${userId}.${category}`)}`;

export const readUnsubscribeToken = (token: string): { userId: string; category: UnsubscribeCategory } | null => {
  const [userId, category, signature, ...rest] = token.split('.');
  if (rest.length > 0 || !/^[0-9a-f]{24}$/.test(userId ?? '') || !signature) return null;
  if (!unsubscribeCategories.includes(category as UnsubscribeCategory)) return null;
  const expected = Buffer.from(sign(`${userId}.${category}`));
  const given = Buffer.from(signature);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return { userId, category: category as UnsubscribeCategory };
};

/** The page link in the footer and the one-click endpoint for the List-Unsubscribe header. */
export const unsubscribeUrls = (userId: string, category: UnsubscribeCategory, locale: Locale) => {
  const token = unsubscribeToken(userId, category);
  return {
    page: siteUrl(locale, `/unsubscribe?t=${token}`),
    oneClick: assetUrl(`/api/unsubscribe?t=${token}`),
  };
};
