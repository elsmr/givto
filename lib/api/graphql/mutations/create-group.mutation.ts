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

  for (const invitee of mongoInvitees) {
    const inviteCode = await loginCodes.create(invitee._id, true);
    mailer.sendMail({
      from: { name: `${creator.name} via Givto` },
      to: invitee,
      subject: `You've been invited to a Secret Santa by ${creator.name}!`,
      template: 'invite',
      variables: {
        creator: creator.name,
        link: `https://givto.app/g/${mongoGroup.slug}?invite=${inviteCode}`
      }
    });
  }

  return mongoGroup ? mapGroup(mongoGroup, '') : null;
};
