import { locales, type Locale } from '../schema/common';

const isLocale = (value: string | undefined): value is Locale =>
  locales.includes(value as Locale);

/**
 * The browser's language for someone without an account setting: a manual switch
 * (Next's `NEXT_LOCALE` cookie) wins, then `Accept-Language`, then en.
 */
export const preferredLocale = (headers: Headers | undefined): Locale => {
  const cookie = headers?.get('cookie')?.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/)?.[1];
  if (isLocale(cookie)) return cookie;
  const accepted = (headers?.get('accept-language') ?? '')
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params.find((param) => param.trim().startsWith('q='));
      return { language: tag.split('-')[0].toLowerCase(), q: q ? Number(q.trim().slice(2)) : 1 };
    })
    .filter(({ q }) => q > 0)
    .sort((a, b) => b.q - a.q);
  return accepted.map(({ language }) => language).find(isLocale) ?? 'en';
};
