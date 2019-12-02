import { MongoUser } from '@givto/api/data-sources/mongo';
import { assignSecretSantas } from '@givto/api/secret-santa.util';
import { AuthenticationError } from 'apollo-server-micro';
import { mapGroup } from '../../graphql-mappers';
import { Group, Mutation } from '../../graphql-schema';

export const assignUsersInGroup: Mutation<{
  slug: string;
}> = async (
  _,
  { slug },
  { dataSources: { groups, users }, mailer, auth }
): Promise<Group | null> => {
  const mongoGroup = await groups.findBySlug(slug);
  const claims = auth.get();

  if (!mongoGroup || !claims) {
    throw new AuthenticationError('Unauthorized');
  }

  const userIds = mongoGroup.users.map(userId => userId.toHexString());
  const assignments = assignSecretSantas(userIds);
  const updatedGroup = await groups.updateBySlug(slug, {
    assignments,
    assignedAt: Date.now()
  });
  const usersInGroup = await users.findByIds(userIds);
  const usersInGroupMap = usersInGroup.reduce(
    (acc, user) => ({ ...acc, [user._id.toHexString()]: user }),
    {} as Record<string, MongoUser>
  );

  for (const user of usersInGroup) {
    const assignee = usersInGroupMap[assignments[user._id.toHexString()]];

    mailer.sendMail({
      from: { name: 'Givto' },
      to: { email: user.email, name: user.name },
      subject: `You have to buy a gift for...`,
      template: 'assigned',
      variables: {
        assignee: assignee.name,
        link: `https://givto.app/g/${mongoGroup.slug}`
      }
    });
  }

  return updatedGroup ? mapGroup(updatedGroup, claims.sub) : null;
};
