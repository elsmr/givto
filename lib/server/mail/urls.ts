import { assetUrl } from '../../../emails/ui/site';

/** The group home, which shows the current edition (every email links there or to the wishlist). */
export const groupUrl = (slug: string) => assetUrl(`/g/${slug}`);

/** The invite email's link (and its reminder's): the join page with the raw token. */
export const inviteUrl = (slug: string, token: string) => assetUrl(`/g/${slug}/join?invite=${token}`);
