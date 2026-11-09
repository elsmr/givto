import { GraphQLError } from 'graphql';
import { mapGroup } from '../../graphql-mappers';
import { Group, Mutation } from '../../graphql-schema';

export const setGroupName: Mutation<{
  slug: string;
  name: string;
}> = async (
  _,
  { slug, name },
  { dataSources: { groups }, auth }
): Promise<Group | null> => {
  const claims = auth.get();

  if (!claims) {
    throw new GraphQLError('No access to group', { extensions: { code: 'UNAUTHENTICATED' } });
  }

  const mongoGroup = await groups.findBySlug(slug);

  console.log(mongoGroup?.users, claims.sub);

  if (
    !mongoGroup?.users?.map(user => user.toHexString()).includes(claims.sub)
  ) {
    throw new GraphQLError('No access to group', { extensions: { code: 'UNAUTHENTICATED' } });
  }
  const updatedGroup = await groups.updateBySlug(slug, { name });

  if (!updatedGroup) {
    return null;
  }

  return updatedGroup ? mapGroup(updatedGroup, claims.sub) : null;
};
