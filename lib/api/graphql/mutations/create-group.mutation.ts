import qs from 'querystring';
import { MongoUser } from '../../data-sources/mongo';
import { mapGroup } from '../../graphql-mappers';
import { Group, Mutation, UserInput } from '../../graphql-schema';
import { generateSlug } from '../../url-generator';
import { assignSecretSantas } from '../../util/secret-santa.util';

export const createGroup: Mutation<{
  creator: UserInput;
  invitees: UserInput[];
}> = async (
  _,
  { creator, invitees },
  { dataSources: { groups, users, loginCodes }, mailer }
): Promise<Group | null> => {
  const allUsers = [creator, ...invitees];
  const [slug, mongoUsers] = await Promise.all([
    generateSlug(groups.hasSlug),
    users.createUsers(...allUsers),
  ]);
  console.log('created', mongoUsers.length, 'users');
  const mongoCreator = mongoUsers.find((user) => user.email === creator.email);
  const mongoUserIds = mongoUsers.map((user) => user._id);
  const userIds = mongoUserIds.map((id) => id.toHexString());

  if (!mongoCreator) {
    return null;
  }

  const assignments = assignSecretSantas(userIds, {});
  console.log('assigned');
  const mongoGroup = await groups.createGroup({
    slug,
    creator: mongoCreator._id,
    users: mongoUserIds,
    assignments,
  });

  if (!mongoGroup) {
    return null;
  }

  const usersInGroupMap = mongoUsers.reduce(
    (acc, user) => ({ ...acc, [user._id.toHexString()]: user }),
    {} as Record<string, MongoUser>
  );

  const invites = mongoUsers.map((user) => {
    const assignee = usersInGroupMap[assignments[user._id.toHexString()]];
    return loginCodes
      .create(user._id, `/g/${mongoGroup.slug}`, true)
      .then((inviteCode) =>
        mailer.sendMail({
          from: { name: `${creator.name} via Givto` },
          to: { email: user.email, name: user.name },
          subject: `${creator.name} invited you to a Secret Santa`,
          template: 'assigned',
          variables: {
            creator: creator.name,
            assignee: assignee.name,
            link: `https://givto.app/go?${qs.encode({
              email: user.email,
              code: inviteCode,
            })}`,
          },
        })
      );
  });

  await Promise.all([
    users.addGroupToUsers(mongoUserIds, mongoGroup._id),
    ...invites,
  ]);

  console.log('invited');

  return mongoGroup
    ? mapGroup(mongoGroup, mongoCreator._id.toHexString())
    : null;
};
