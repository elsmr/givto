import { sendInviteEmails } from '@givto/api/util/mail';
import { mapGroup } from '../../graphql-mappers';
import { Group, Mutation, UserInput } from '../../graphql-schema';
import { generateSlug } from '../../url-generator';

export const createGroup: Mutation<{
  creator: UserInput;
  invitees: UserInput[];
}> = async (
  _,
  { creator, invitees },
  { dataSources: { groups, users, loginCodes }, mailer }
): Promise<Group | null> => {
  const allUsers = [creator, ...invitees];
  const slug = await generateSlug(groups.hasSlug);
  const mongoUsers = await users.createUsers(...allUsers);
  const mongoCreator = mongoUsers.find(user => user.email === creator.email);
  const mongoInvitees = mongoUsers.filter(user => user.email !== creator.email);
  const mongoUserIds = mongoUsers.map(user => user._id);
  console.log('created', mongoUsers.length, 'users');

  if (!mongoCreator) {
    return null;
  }

  const mongoGroup = await groups.createGroup({
    slug,
    creator: mongoCreator._id,
    users: mongoUserIds
  });

  if (!mongoGroup) {
    return null;
  }

  const didUpdateUsers = await users.addGroupToUsers(
    mongoUserIds,
    mongoGroup._id
  );

  if (!didUpdateUsers) {
    return null;
  }

  await sendInviteEmails(
    mongoGroup.slug,
    mongoInvitees,
    creator,
    mailer,
    loginCodes
  );

  return mongoGroup ? mapGroup(mongoGroup, '') : null;
};
