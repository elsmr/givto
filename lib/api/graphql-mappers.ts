import { ObjectID } from 'mongodb';
import { MongoGroup, MongoLoginCode, MongoUser } from './data-sources/mongo';
import { Group, LoginCode, User } from './graphql-schema';

const objectIdToString = (objectId: ObjectID) => objectId.toHexString();

export const mapGroup = (group: MongoGroup): Group => ({
  id: group._id.toHexString(),
  name: group.name,
  slug: group.slug,
  options: {},
  users: group.users.map(objectIdToString)
});

export const mapUser = (user: MongoUser): User => ({
  id: user._id.toHexString(),
  email: user.email,
  name: user.name,
  groups: user.groups.map(objectIdToString)
});

export const mapLoginCode = (loginCode: MongoLoginCode): LoginCode => ({
  code: loginCode.code,
  email: loginCode.email,
  exp: new Date(loginCode.exp)
});
