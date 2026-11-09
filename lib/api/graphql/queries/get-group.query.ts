import { ObjectIDMapper } from '@givto/api/util';
import { GraphQLError } from 'graphql';
import { mapGroup } from '../../graphql-mappers';
import { Group, Query } from '../../graphql-schema';

export const getGroup: Query<{ slug: string }> = async (
  _,
  { slug },
  { dataSources: { groups }, auth }
): Promise<Group | null> => {
  const claims = auth.get();

  if (!claims) {
    throw new GraphQLError('No access to group', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }

  const mongoGroup = await groups.findBySlug(slug);
  if (!mongoGroup) {
    throw new GraphQLError('No access to group', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }

  const isUserInGroup = Boolean(
    mongoGroup.users.find(
      objId => ObjectIDMapper.toString(objId) === claims.sub
    )
  );
  if (!isUserInGroup) {
    throw new GraphQLError('No access to group', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }

  return mapGroup(mongoGroup, claims.sub);
};
