import { MongoGroup, MongoLoginCode, MongoUser } from './data-sources/mongo';
import { Group, LoginCode, User } from './graphql-schema';
import { ObjectIDMapper } from './util';

export const mapGroup = (group: MongoGroup, userId?: string): Group => {
  const assignee = userId ? group.assignments[userId] : null;
  return {
    id: group._id.toHexString(),
    name: group.name,
    slug: group.slug,
    options: {},
    creator: ObjectIDMapper.toString(group.creator),
    users: group.users.map(ObjectIDMapper.toString),
    assignee: assignee
      ? { user: assignee, wishlist: group.wishlists[assignee] || [] }
      : null,
    wishlist: (userId && group.wishlists[userId]) || [],
    assignedAt: group.assignedAt ? new Date(group.assignedAt) : null,
    createdAt: new Date(group.createdAt)
  };
};

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
