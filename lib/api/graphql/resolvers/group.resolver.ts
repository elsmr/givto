import { mapUser } from '../../graphql-mappers';
import {
  EnrichedAssignee,
  Group,
  ResolverObject,
  User
} from '../../graphql-schema';

export const groupResolver: ResolverObject<Group> = {
  async users(group, _, { dataSources: { users } }): Promise<User[]> {
    console.log('resolve users for group', group.slug);
    const mongoUsers = await users.findByIds(group.users);
    return mongoUsers.map(mapUser);
  },
  async assignee(
    group,
    _,
    { dataSources: { users } }
  ): Promise<EnrichedAssignee | null> {
    if (!group.assignee) {
      return null;
    }

    const mongoUser = await users.findById(group.assignee.user);

    if (!mongoUser) {
      return null;
    }

    return {
      wishlist: group.assignee.wishlist,
      user: mapUser(mongoUser)
    };
  }
};
