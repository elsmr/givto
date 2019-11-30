import { mapGroup } from '../../graphql-mappers';
import { Group, Mutation } from '../../graphql-schema';

export const setGroupName: Mutation<{
  slug: string;
  name: string;
}> = async (
  _,
  { slug, name },
  { dataSources: { groups } }
): Promise<Group | null> => {
  const mongoGroup = await groups.updateBySlug(slug, name);

  if (!mongoGroup) {
    return null;
  }

  return mongoGroup ? mapGroup(mongoGroup) : null;
};
