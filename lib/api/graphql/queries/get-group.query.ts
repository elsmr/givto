import { ObjectIDMapper } from '@givto/api/util';
import { AuthenticationError } from 'apollo-server-micro';
import { mapGroup } from '../../graphql-mappers';
import { Group, Query } from '../../graphql-schema';

export const getGroup: Query<{ slug: string }> = async (
  _,
  { slug },
  { dataSources: { groups }, auth }
): Promise<Group | null> => {
  const claims = auth.get();

  if (!claims) {
    throw new AuthenticationError('No access to group');
  }

  const mongoGroup = await groups.findBySlug(slug);
  if (!mongoGroup) {
    throw new AuthenticationError('No access to group');
  }

  const isUserInGroup = Boolean(
    mongoGroup.users.find(
      objId => ObjectIDMapper.toString(objId) === claims.sub
    )
  );
  if (!isUserInGroup) {
    throw new AuthenticationError('No access to group');
  }

  return mapGroup(mongoGroup);
};
