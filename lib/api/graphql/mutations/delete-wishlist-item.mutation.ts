import { WishListItem } from '@givto/api/data-sources/mongo';
import { AuthenticationError } from 'apollo-server-micro';
import { Mutation } from '../../graphql-schema';

export const deleteWishlistItem: Mutation<{
  slug: string;
  wishlistItemId: string;
}> = async (
  _,
  { slug, wishlistItemId },
  { dataSources: { groups }, auth }
): Promise<WishListItem[]> => {
  const claims = auth.get();

  if (!claims) {
    throw new AuthenticationError('Unauthorized');
  }

  const wishlist = await groups.deleteWishlistItem(
    slug,
    claims.sub,
    wishlistItemId
  );

  if (!wishlist) {
    throw new AuthenticationError('Unauthorized');
  }

  return wishlist;
};
