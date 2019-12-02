import { AuthenticationError } from 'apollo-server-micro';
import { WishListItem } from '../../data-sources/mongo';
import { mapGroup } from '../../graphql-mappers';
import { Group, Mutation } from '../../graphql-schema';

export const setWishlist: Mutation<{
  slug: string;
  wishlist: WishListItem[];
}> = async (
  _,
  { slug, wishlist },
  { dataSources: { groups }, auth }
): Promise<Group | null> => {
  const claims = auth.get();

  if (!claims) {
    throw new AuthenticationError('Unauthorized');
  }

  const mongoGroup = await groups.updateBySlug(slug, {
    [`wishlists.${claims.sub}`]: wishlist
  });

  if (!mongoGroup) {
    throw new AuthenticationError('Unauthorized');
  }

  return mongoGroup ? mapGroup(mongoGroup, claims.sub) : null;
};
