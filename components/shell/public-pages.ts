// Production origin: canonical and hreflang URLs always point here, also on previews.
export const siteUrl = 'https://givto.app';

// The only indexable routes (37); every other page gets `noindex`. Keep public/sitemap.xml in sync.
export const publicPages = { '/': 'home', '/privacy': 'privacy' } as const;
export type PublicPath = keyof typeof publicPages;

export const isPublicPath = (pathname: string): pathname is PublicPath =>
  Object.hasOwn(publicPages, pathname);

/** Only these pages have the language in the URL (`pages/nl/`); en has no prefix. */
export const localePath = (pathname: PublicPath, locale: string) =>
  `${locale === 'en' ? '' : `/${locale}`}${pathname === '/' ? '' : pathname}` || '/';

export const publicUrl = (pathname: PublicPath, locale: string) =>
  `${siteUrl}${localePath(pathname, locale)}`;

/** The indexable page a route renders, whatever its language: `/nl/privacy` is `/privacy`. */
export const publicPathOf = (pathname: string): PublicPath | undefined => {
  const path = pathname.replace(/^\/nl(?=\/|$)/, '') || '/';
  return isPublicPath(path) ? path : undefined;
};
