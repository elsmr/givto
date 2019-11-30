import { mapUser } from '../../graphql-mappers';
import { Mutation, User } from '../../graphql-schema';

export const updateUser: Mutation<{
  email: string;
  update: Partial<{ name: string; email: string }>;
}> = async (
  _,
  { email, update },
  { dataSources: { users } }
): Promise<User | null> => {
  const mongoUser = await users.updateByEmail(email, update);

  if (!mongoUser) {
    return null;
  }

  return mongoUser ? mapUser(mongoUser) : null;
};
