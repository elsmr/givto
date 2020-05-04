import { gql, IFieldResolver, IResolverObject } from 'apollo-server-micro';
import { GraphQLScalarType, Kind, ValueNode } from 'graphql';
import { Db } from 'mongodb';
import { Auth } from './auth';
import {
  MongoGroups,
  MongoLoginCodes,
  MongoUsers,
  WishListItem,
} from './data-sources/mongo';
import { Mailer } from './mail';

export interface Invite {
  id: string;
  invitee: string;
  group: string;
}

export interface LoginCode {
  code: string;
  exp: Date;
  userId: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  groups: string[];
}

export type EnrichedUser = {
  id: string;
  email: string;
  name: string;
  groups: EnrichedGroup[];
};

export interface Assignee {
  wishlist: WishListItem[];
  user: string;
}

export type EnrichedAssignee = {
  wishlist: WishListItem[];
  user: User;
};

export interface Group {
  id: string;
  slug: string;
  name: string;
  users: string[];
  creator: string;
  options: {};
  wishlist: WishListItem[];
  assignedAt: Date | null;
  createdAt: Date;
  assignee: null | Assignee;
  userCount: number;
}

export type EnrichedGroup = {
  id: string;
  slug: string;
  name: string;
  options: {};
  users: EnrichedUser[];
  creator: EnrichedUser;
  wishlist: WishListItem[];
  assignedAt: Date | null;
  createdAt: Date;
  assignee: null | EnrichedAssignee;
  userCount: number;
};

export interface UserInput {
  name: string;
  email: string;
}

export interface GivtoContext {
  dataSources: GivtoDataSources;
  db: Db;
  mailer: Mailer;
  auth: Auth;
}

export interface GivtoDataSources {
  users: MongoUsers;
  groups: MongoGroups;
  loginCodes: MongoLoginCodes;
}

export type Mutation<TArgs> = IFieldResolver<null, GivtoContext, TArgs>;
export type Query<TArgs> = IFieldResolver<null, GivtoContext, TArgs>;
export type ResolverObject<TRoot> = IResolverObject<TRoot, GivtoContext, null>;

export const typeDefs = gql`
  scalar Date

  type LoginCode {
    code: String
    user: User
    exp: Date
  }

  type GroupOptions {
    matchDate: Date
  }

  type WishlistItem {
    id: String!
    title: String!
    description: String!
  }

  type Assignee {
    user: User!
    wishlist: [WishlistItem]!
  }

  type Group {
    id: ID!
    slug: String!
    name: String!
    users: [User]!
    creator: User!
    options: GroupOptions!
    assignee: Assignee
    wishlist: [WishlistItem]!
    assignedAt: Date
    createdAt: Date!
    userCount: Int!
  }

  type User {
    id: ID!
    name: String!
    email: String!
    groups: [Group]!
  }

  input UserInput {
    name: String!
    email: String!
  }

  input UserUpdate {
    name: String
    email: String
  }

  type Query {
    getGroup(slug: String!): Group
    getLoginCode(code: String!): LoginCode
    getCurrentUser: User
  }

  input WishlistItemInput {
    id: String
    title: String
    description: String
  }

  input AssignmentException {
    subject: String!
    object: String!
  }

  type Mutation {
    createGroup(creator: UserInput!, invitees: [UserInput]!): Group
    createLoginCode(
      email: String!
      name: String
      redirectUrl: String
      code: String
    ): Boolean
    updateUser(email: String!, update: UserUpdate!): User
    setGroupName(slug: String!, name: String!): Group
    assignUsersInGroup(slug: String!): Group
    deleteWishlistItem(slug: String!, wishlistItemId: String!): [WishlistItem]
    addWishlistItem(
      slug: String!
      wishlistItem: WishlistItemInput!
    ): [WishlistItem]
    editWishlistItem(
      slug: String!
      wishlistItemId: String!
      update: WishlistItemInput!
    ): [WishlistItem]
    reorderWishlistItem(
      slug: String!
      wishlistItemId: String!
      destinationIndex: Int!
    ): [WishlistItem]
    addAssignmentException(
      slug: String!
      exception: AssignmentException!
    ): Group
    addUsersToGroup(slug: String!, invitees: [UserInput]!): Group
  }
`;

export const scalarResolvers = {
  Date: new GraphQLScalarType({
    name: 'Date',
    description: 'Date scalar type',
    parseValue(value: string) {
      return new Date(value);
    },
    serialize(value: Date) {
      console.log({ value });
      return value.getTime();
    },
    parseLiteral(ast: ValueNode) {
      if (ast.kind === Kind.INT) {
        return new Date(ast.value);
      }
      return null;
    },
  }),
};
