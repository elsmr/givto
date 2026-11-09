import { GraphQLError } from 'graphql';
import { WithId } from 'mongodb';
import { randomInt } from 'node:crypto';
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
import {
  drawAssignments,
  Exclusion,
  findStuckGivers,
} from '../../util/secret-santa.util';

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
  const stuck = findStuckGivers(
    [...new Set(allUsers.map((user) => user.email))],
    bothWays(settings?.exclusions ?? [])
  );
  if (stuck) {
    const nameOf = (email: string) =>
      allUsers.find((user) => user.email === email)?.name ?? email;
    const list = (emails: string[]) =>
      new Intl.ListFormat('en-GB').format(emails.map(nameOf));
    const reason = stuck.receivers.length
      ? `can only give to ${list(stuck.receivers)}`
      : `can't give to anyone`;
    throw new GraphQLError(
      `These exclusions make a draw impossible: ${list(stuck.givers)} ${reason}`,
      {
        extensions: {
          code: 'BAD_USER_INPUT',
          stuckGivers: stuck.givers,
          possibleReceivers: stuck.receivers,
        },
      }
    );
  }

  const slug = settings?.slug ?? (await generateSlug(groups.hasSlug));
  const mongoUsers = await users.createUsers(...allUsers);
  const mongoCreator = mongoUsers.find((user) => user.email === creator.email);
  const mongoUserIds = mongoUsers.map((user) => user._id);
  const userIds = mongoUserIds.map((id) => id.toHexString());
  const usersByEmail = mongoUsers.reduce(
    (acc, user) => ({ ...acc, [user.email]: user }),
    {} as Record<string, WithId<MongoUser>>
  );
  const locale = settings?.locale;
  const locales = settings?.locales;
  const exclusions = (settings?.exclusions ?? []).map(({ from, to }) => ({
    from: usersByEmail[from]._id.toHexString(),
    to: usersByEmail[to]._id.toHexString(),
  }));

  console.log(exclusions);
  console.log(settings?.locales);

  if (!mongoCreator) {
    return null;
  }

  const assignments = drawAssignments(userIds, bothWays(exclusions), randomInt);

  const mongoGroup = await groups.createGroup({
    slug,
    name: settings?.name,
    creator: mongoCreator._id,
    users: mongoUserIds,
    assignments,
    exclusions,
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
    const userLocale =
      locales?.find((l) => l.email === user.email)?.locale ?? locale ?? 'en';
    return loginCodes
      .create(user._id, `/g/${mongoGroup.slug}`, true)
      .then((inviteCode) =>
        mailer.sendMail({
          from: { name: `${creator.name} via Givto` },
          to: { email: user.email, name: user.name },
          subject: getEmailSubject(userLocale, creator.name),
          template: 'assigned',
          variables: {
            creator: creator.name,
            assignee: assignee.name,
            locale: userLocale,
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

// The API treats exclusions as symmetric; the draw supports one-way ones.
const bothWays = (exclusions: Exclusion[]): Exclusion[] =>
  exclusions.flatMap(({ from, to }) => [
    { from, to },
    { from: to, to: from },
  ]);

const getEmailSubject = (locale: string, name: string): string => {
  switch (locale) {
    case 'nl':
      return `${name} heeft je uitgenodigd voor Secret Santa`;
    case 'en':
    default:
      return `${name} invited you to a Secret Santa`;
  }
};
