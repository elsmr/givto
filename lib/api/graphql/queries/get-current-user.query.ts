import { GraphQLError } from 'graphql';
import { mapUser } from '../../graphql-mappers';
import { Query, User } from '../../graphql-schema';

export const getCurrentUser: Query<null> = async (
  _root,
  _args,
  { dataSources: { users }, auth }
): Promise<User | null> => {
  const claims = auth.get();

  if (!claims) {
    throw new GraphQLError('Unauthenticated', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }

  const user = await users.findById(claims.sub);
  return user ? mapUser(user) : null;
};
