import { MongoUser } from '@givto/api/data-sources/mongo';
import { sendInviteEmails } from '@givto/api/util/mail';
import { AuthenticationError } from 'apollo-server-micro';
import { mapGroup } from '../../graphql-mappers';
import { Group, Mutation, UserInput } from '../../graphql-schema';

export const addUsersToGroup: Mutation<{
  slug: string;
  invitees: UserInput[];
}> = async (
  _,
  { slug, invitees },
  { dataSources: { groups, users, loginCodes }, mailer }
): Promise<Group | null> => {
  const group = await groups.findBySlug(slug);
  if (!group) {
    throw new AuthenticationError('Unauthenticated');
  }

  const mongoUsers = await users.createUsers(...invitees);
  const userIds = mongoUsers.map(user => user._id);
  await Promise.all([
    users.addGroupToUsers(userIds, group._id),
    groups.addUsersToGroup(slug, userIds)
  ]);

  const creator = (await users.findById(
    group.creator.toHexString()
  )) as MongoUser;

  await sendInviteEmails(group.slug, mongoUsers, creator, mailer, loginCodes);

  return group ? mapGroup(group, '') : null;
};
