import { mapGroup } from '@givto/api/graphql-mappers';
import { Group, ResolverObject, User } from '../../graphql-schema';

export const userResolver: ResolverObject<User> = {
  async groups(user, _, { dataSources: { groups } }): Promise<Group[]> {
    console.log('resolve groups for user', user.email);
    const mongoGroups = await groups.findByIds(user.groups);
    return mongoGroups.map((group) => mapGroup(group, user.id));
  },
};
