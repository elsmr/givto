import { ObjectIDMapper } from '@givto/api/util';
import { mapGroup } from '../../graphql-mappers';
import { Group, Query } from '../../graphql-schema';

export const getGroup: Query<{ slug: string }> = async (
  _,
  { slug },
  { dataSources: { groups }, auth }
): Promise<Group | null> => {
  const claims = auth.get();

  if (!claims) {
    return null;
  }

  const mongoGroup = await groups.findBySlug(slug);
  if (!mongoGroup) {
    return null;
  }

  const isUserInGroup = Boolean(
    mongoGroup.users.find(
      objId => ObjectIDMapper.toString(objId) === claims.sub
    )
  );
  if (!isUserInGroup) {
    return null;
  }

  return mapGroup(mongoGroup);
};
