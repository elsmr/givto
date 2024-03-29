import { WishListItem, WishListItemInput } from '@givto/api/data-sources/mongo';
import { AuthenticationError } from 'apollo-server-micro';
import { Mutation } from '../../graphql-schema';

export const editWishlistItem: Mutation<{
  slug: string;
  wishlistItemId: string;
  update: Partial<WishListItemInput>;
}> = async (
  _,
  { slug, wishlistItemId, update },
  { dataSources: { groups }, auth }
): Promise<WishListItem[]> => {
  const claims = auth.get();

  if (!claims) {
    throw new AuthenticationError('Unauthorized');
  }

  const wishlist = await groups.editWishlistItem(
    slug,
    claims.sub,
    wishlistItemId,
    update
  );

  if (!wishlist) {
    throw new AuthenticationError('Unauthorized');
  }

  return wishlist;
};
