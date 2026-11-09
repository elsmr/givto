import { GifteeWishlist } from './giftee-wishlist';
import { GroupWishlist } from './group-wishlist';

interface EditionWishlistsProps {
  groupSlug: string;
  editionNumber: number;
}

/**
 * Wishlist sections for a group home (38): my wishlist as this group sees it (hide / unhide)
 * and, once the draw is done, my giftee's wishlist with Dibs!. Pages using this must load
 * the `wishlist` messages namespace.
 */
export const EditionWishlists = ({ groupSlug, editionNumber }: EditionWishlistsProps) => (
  <div className="grid gap-8 lg:grid-cols-2">
    <GifteeWishlist groupSlug={groupSlug} editionNumber={editionNumber} />
    <GroupWishlist groupSlug={groupSlug} />
  </div>
);
