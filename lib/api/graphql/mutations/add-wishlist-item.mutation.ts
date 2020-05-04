import { WishListItem, WishListItemInput } from '@givto/api/data-sources/mongo';
import { AuthenticationError } from 'apollo-server-micro';
import { Mutation } from '../../graphql-schema';

export const addWishlistItem: Mutation<{
  slug: string;
  wishlistItem: WishListItemInput;
}> = async (
  _,
  { slug, wishlistItem },
  { dataSources: { groups }, auth }
): Promise<WishListItem[]> => {
  const claims = auth.get();

  if (!claims) {
    throw new AuthenticationError('Unauthorized');
  }

  const wishlist = await groups.addWishlistItem(slug, claims.sub, wishlistItem);

  if (!wishlist) {
    throw new AuthenticationError('Unauthorized');
  }

  return wishlist;
};
