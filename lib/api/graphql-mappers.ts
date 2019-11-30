import { MongoGroup, MongoLoginCode, MongoUser } from './data-sources/mongo';
import { Group, LoginCode, User } from './graphql-schema';
import { ObjectIDMapper } from './util';

export const mapGroup = (group: MongoGroup): Group => ({
  id: group._id.toHexString(),
  name: group.name,
  slug: group.slug,
  options: {},
  creator: ObjectIDMapper.toString(group.creator),
  users: group.users.map(ObjectIDMapper.toString)
});

export const mapUser = (user: MongoUser): User => ({
  id: user._id.toHexString(),
  email: user.email,
  name: user.name,
  groups: user.groups.map(ObjectIDMapper.toString)
});

export const mapLoginCode = (loginCode: MongoLoginCode): LoginCode => ({
  code: loginCode.code,
  userId: loginCode.userId.toHexString(),
  exp: new Date(loginCode.exp)
});
