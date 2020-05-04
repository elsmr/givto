import { WishListItem } from '@givto/api/data-sources/mongo';
import { AuthenticationError } from 'apollo-server-micro';
import { Mutation } from '../../graphql-schema';

export const reorderWishlistItem: Mutation<{
  slug: string;
  wishlistItemId: string;
  destinationIndex: number;
}> = async (
  _,
  { slug, wishlistItemId, destinationIndex },
  { dataSources: { groups }, auth }
): Promise<WishListItem[]> => {
  const claims = auth.get();

  if (!claims) {
    throw new AuthenticationError('Unauthorized');
  }

  const wishlist = await groups.reorderWishlistItem(
    slug,
    claims.sub,
    wishlistItemId,
    destinationIndex
  );

  if (!wishlist) {
    throw new AuthenticationError('Unauthorized');
  }

  return wishlist;
};
