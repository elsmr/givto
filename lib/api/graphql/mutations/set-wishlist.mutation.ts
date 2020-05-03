import { AuthenticationError } from 'apollo-server-micro';
import { nanoid } from 'nanoid';
import { WishListItemInput } from '../../data-sources/mongo';
import { mapGroup } from '../../graphql-mappers';
import { Group, Mutation } from '../../graphql-schema';

export const setWishlist: Mutation<{
  slug: string;
  wishlist: WishListItemInput[];
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
    [`wishlists.${claims.sub}`]: wishlist.map((w) => ({ ...w, id: nanoid() })),
  });

  if (!mongoGroup) {
    throw new AuthenticationError('Unauthorized');
  }

  return mongoGroup ? mapGroup(mongoGroup, claims.sub) : null;
};
