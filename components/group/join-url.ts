/**
 * The shareable link, in the group's language so chat previews (rendered without a browser)
 * match the group; people's own language preference still wins once the page loads.
 */
export const joinUrl = (slug: string, token: string, locale: string) =>
  `${window.location.origin}${locale === 'en' ? '' : `/${locale}`}/g/${slug}/join?token=${encodeURIComponent(token)}`;
