import { siteUrl } from '../../../emails/ui/site';
import type { Locale } from '../../schema/common';

/** The group home, which shows the current edition (every email links there or to the wishlist). */
export const groupUrl = (locale: Locale, slug: string) => siteUrl(locale, `/g/${slug}`);
