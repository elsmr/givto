// Production origin: canonical and hreflang URLs always point here, also on previews.
export const siteUrl = 'https://givto.app';

// The only indexable routes (37); every other page gets `noindex`. Keep public/sitemap.xml in sync.
export const publicPages = { '/': 'home', '/privacy': 'privacy', '/pick': 'pick' } as const;
export type PublicPath = keyof typeof publicPages;

export const isPublicPath = (pathname: string): pathname is PublicPath =>
  Object.hasOwn(publicPages, pathname);

export const publicUrl = (
  pathname: PublicPath,
  locale: string,
  defaultLocale: string,
) => {
  const localePrefix = locale === defaultLocale ? '' : `/${locale}`;
  const path = `${localePrefix}${pathname === '/' ? '' : pathname}`;
  return `${siteUrl}${path || '/'}`;
};
