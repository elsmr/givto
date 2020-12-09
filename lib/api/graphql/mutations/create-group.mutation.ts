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
  const slug = await generateSlug(groups.hasSlug);
  const mongoUsers = await users.createUsers(...allUsers);
  const mongoCreator = mongoUsers.find((user) => user.email === creator.email);
  const mongoUserIds = mongoUsers.map((user) => user._id);
  const userIds = mongoUserIds.map((id) => id.toHexString());
  const assignments = assignSecretSantas(userIds, {});
  console.log('created', mongoUsers.length, 'users');

  if (!mongoCreator) {
    return null;
  }

  const mongoGroup = await groups.createGroup({
    slug,
    creator: mongoCreator._id,
    users: mongoUserIds,
    assignments,
  });

  if (!mongoGroup) {
    return null;
  }

  await users.addGroupToUsers(mongoUserIds, mongoGroup._id);

  const updatedGroup = await groups.updateBySlug(slug, {
    assignments,
    assignedAt: Date.now(),
  });
  const usersInGroup = await users.findByIds(userIds);
  const usersInGroupMap = usersInGroup.reduce(
    (acc, user) => ({ ...acc, [user._id.toHexString()]: user }),
    {} as Record<string, MongoUser>
  );

  const mailPromises: Promise<any>[] = [];
  for (const user of usersInGroup) {
    const assignee = usersInGroupMap[assignments[user._id.toHexString()]];
    const inviteCode = await loginCodes.create(
      user._id,
      `/g/${mongoGroup.slug}`,
      true
    );
    const params = qs.encode({ email: user.email, code: inviteCode });

    mailPromises.push(
      mailer.sendMail({
        from: { name: `${creator.name} via Givto` },
        to: { email: user.email, name: user.name },
        subject: `${creator.name} invited you to a Secret Santa`,
        template: 'assigned',
        variables: {
          creator: creator.name,
          assignee: assignee.name,
          link: `https://givto.app/go?${params}`,
        },
      })
    );
  }

  await Promise.all(mailPromises);

  return updatedGroup
    ? mapGroup(updatedGroup, mongoCreator._id.toHexString())
    : null;
};
