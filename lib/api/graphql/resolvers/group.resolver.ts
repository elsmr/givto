import { mapUser } from '../../graphql-mappers';
import { Group, ResolverObject, User } from '../../graphql-schema';

export const groupResolver: ResolverObject<Group> = {
  async users(group, _, { dataSources: { users } }): Promise<User[]> {
    console.log('resolve users for group', group.slug);
    const mongoUsers = await users.findByIds(group.users);
    return mongoUsers.map(mapUser);
  }
};
