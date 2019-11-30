import { mapUser } from '../../graphql-mappers';
import { LoginCode, ResolverObject, User } from '../../graphql-schema';

export const loginCodeResolver: ResolverObject<LoginCode> = {
  async user(loginCode, _, { dataSources: { users } }): Promise<User | null> {
    console.log('resolve users for loginCode', loginCode.code);
    const mongoUser = await users.findById(loginCode.userId);
    if (mongoUser) {
      return mapUser(mongoUser);
    }
    return null;
  }
};
