import qs from 'querystring';
import { MongoUser } from '../../data-sources/mongo';
import { mapGroup } from '../../graphql-mappers';
import {
  Group,
  GroupSettingsInput,
  Mutation,
  UserInput,
} from '../../graphql-schema';
import { generateSlug } from '../../url-generator';
import { assignSecretSantas } from '../../util/secret-santa.util';

export const createGroup: Mutation<{
  creator: UserInput;
  invitees: UserInput[];
  settings?: GroupSettingsInput;
}> = async (
  _,
  { creator, invitees, settings },
  { dataSources: { groups, users, loginCodes }, mailer }
): Promise<Group | null> => {
  const allUsers = [creator, ...invitees];
  const slug = settings?.slug ?? (await generateSlug(groups.hasSlug));
  const mongoUsers = await users.createUsers(...allUsers);
  const mongoCreator = mongoUsers.find((user) => user.email === creator.email);
  const mongoUserIds = mongoUsers.map((user) => user._id);
  const userIds = mongoUserIds.map((id) => id.toHexString());

  if (!mongoCreator) {
    return null;
  }

  const assignments = assignSecretSantas(userIds, {});
  const mongoGroup = await groups.createGroup({
    slug,
    creator: mongoCreator._id,
    users: mongoUserIds,
    assignments,
    assignExceptions: Object.fromEntries(
      settings?.assignExceptions?.map(({ from, to }) => [from, to]) ?? []
    ),
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

  return mongoGroup
    ? mapGroup(mongoGroup, mongoCreator._id.toHexString())
    : null;
};
