import { mapGroup } from '@givto/api/graphql-mappers';
import { Group, ResolverObject, User } from '../../graphql-schema';

export const userResolver: ResolverObject<User> = {
  async groups(user, _, { dataSources: { groups }, auth }): Promise<Group[]> {
    // Groups carry the user's assignee, so only the user may see them.
    if (auth.get()?.sub !== user.id) {
      return [];
    }
    console.log('resolve groups for user', user.email);
    const mongoGroups = await groups.findByIds(user.groups);
    return mongoGroups.map((group) => mapGroup(group, user.id));
  },
};
