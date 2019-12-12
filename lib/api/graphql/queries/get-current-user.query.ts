import { AuthenticationError } from 'apollo-server-micro';
import { mapUser } from '../../graphql-mappers';
import { Query, User } from '../../graphql-schema';

export const getCurrentUser: Query<null> = async (
  _root,
  _args,
  { dataSources: { users }, auth }
): Promise<User | null> => {
  const claims = auth.get();

  if (!claims) {
    throw new AuthenticationError('Unauthenticated');
  }

  const user = await users.findById(claims.sub);
  return user ? mapUser(user) : null;
};
