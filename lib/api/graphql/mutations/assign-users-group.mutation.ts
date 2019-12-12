import { MongoUser } from '@givto/api/data-sources/mongo';
import { assignSecretSantas } from '@givto/api/util/secret-santa.util';
import { AuthenticationError } from 'apollo-server-micro';
import { mapGroup } from '../../graphql-mappers';
import { Group, Mutation } from '../../graphql-schema';

export const assignUsersInGroup: Mutation<{
  slug: string;
}> = async (
  _,
  { slug },
  { dataSources: { groups, users, loginCodes }, mailer, auth }
): Promise<Group | null> => {
  const mongoGroup = await groups.findBySlug(slug);
  const claims = auth.get();

  if (!mongoGroup || !claims) {
    throw new AuthenticationError('Unauthorized');
  }
  if (mongoGroup.creator.toHexString() !== claims.sub) {
    throw new AuthenticationError('Unauthorized');
  }

  const userIds = mongoGroup.users.map(userId => userId.toHexString());
  const assignments = assignSecretSantas(userIds, mongoGroup.assignExceptions);
  const updatedGroup = await groups.updateBySlug(slug, {
    assignments,
    assignedAt: Date.now()
  });
  const usersInGroup = await users.findByIds(userIds);
  const usersInGroupMap = usersInGroup.reduce(
    (acc, user) => ({ ...acc, [user._id.toHexString()]: user }),
    {} as Record<string, MongoUser>
  );

  const mailPromises: Promise<any>[] = [];
  for (const user of usersInGroup) {
    const assignee = usersInGroupMap[assignments[user._id.toHexString()]];
    const inviteCode = await loginCodes.create(user._id, true);

    mailPromises.push(
      mailer.sendMail({
        from: { name: 'Givto' },
        to: { email: user.email, name: user.name },
        subject: `You have to buy a gift for...`,
        template: 'assigned',
        variables: {
          assignee: assignee.name,
          link: `https://givto.app/g/${mongoGroup.slug}?invite=${inviteCode}`
        }
      })
    );
  }

  console.log(updatedGroup);
  await Promise.all(mailPromises);

  return updatedGroup ? mapGroup(updatedGroup, claims.sub) : null;
};
