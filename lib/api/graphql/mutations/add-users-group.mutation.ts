import { MongoUser } from '@givto/api/data-sources/mongo';
import { sendInviteEmails } from '@givto/api/util/mail';
import { GraphQLError } from 'graphql';
import { mapGroup } from '../../graphql-mappers';
import { Group, Mutation, UserInput } from '../../graphql-schema';

export const addUsersToGroup: Mutation<{
  slug: string;
  invitees: UserInput[];
}> = async (
  _,
  { slug, invitees },
  { dataSources: { groups, users, loginCodes }, mailer, auth }
): Promise<Group | null> => {
  const claims = auth.get();
  const group = await groups.findBySlug(slug);
  if (!claims || !group?.users.some((id) => id.toHexString() === claims.sub)) {
    throw new GraphQLError('No access to group', { extensions: { code: 'UNAUTHENTICATED' } });
  }

  const mongoUsers = await users.createUsers(...invitees);
  const userIds = mongoUsers.map(user => user._id);
  const [, updatedGroup] = await Promise.all([
    users.addGroupToUsers(userIds, group._id),
    groups.addUsersToGroup(slug, userIds)
  ]);

  const creator = (await users.findById(
    group.creator.toHexString()
  )) as MongoUser;

  await sendInviteEmails(group.slug, mongoUsers, creator, mailer, loginCodes);

  return updatedGroup ? mapGroup(updatedGroup, claims.sub) : null;
};
