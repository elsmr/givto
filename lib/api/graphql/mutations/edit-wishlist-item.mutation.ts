import { WishListItemInput } from '../../data-sources/mongo';
import { Mutation } from '../../graphql-schema';

export const addWishlistItem: Mutation<{
  slug: string;
  item: WishListItemInput;
}> = async (
  _,
  { slug, item },
  { dataSources: { groups }, auth }
): Promise<void> => {};
