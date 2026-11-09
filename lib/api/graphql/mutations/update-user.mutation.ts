import { GraphQLError } from 'graphql';
import { mapUser } from '../../graphql-mappers';
import { Mutation, User } from '../../graphql-schema';

export const updateUser: Mutation<{
  email: string;
  update: Partial<{ name: string; email: string }>;
}> = async (
  _,
  { email, update },
  { dataSources: { users }, auth }
): Promise<User | null> => {
  const claims = auth.get();
  const currentUser = claims && (await users.findById(claims.sub));

  if (currentUser?.email !== email) {
    throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHENTICATED' } });
  }

  const mongoUser = await users.updateByEmail(email, update);

  if (!mongoUser) {
    return null;
  }

  return mongoUser ? mapUser(mongoUser) : null;
};
