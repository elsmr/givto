import { WishListItem, WishListItemInput } from '@givto/api/data-sources/mongo';
import { GraphQLError } from 'graphql';
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
    throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHENTICATED' } });
  }

  const wishlist = await groups.editWishlistItem(
    slug,
    claims.sub,
    wishlistItemId,
    update
  );

  if (!wishlist) {
    throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHENTICATED' } });
  }

  return wishlist;
};
