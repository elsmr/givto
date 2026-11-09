import { WishListItem } from '@givto/api/data-sources/mongo';
import { GraphQLError } from 'graphql';
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
    throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHENTICATED' } });
  }

  const wishlist = await groups.reorderWishlistItem(
    slug,
    claims.sub,
    wishlistItemId,
    destinationIndex
  );

  if (!wishlist) {
    throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHENTICATED' } });
  }

  return wishlist;
};
