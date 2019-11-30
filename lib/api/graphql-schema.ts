import { gql, IFieldResolver, IResolverObject } from 'apollo-server-micro';
import { GraphQLScalarType, Kind, ValueNode } from 'graphql';
import { Db } from 'mongodb';
import { Auth } from './auth';
import { MongoGroups, MongoLoginCodes, MongoUsers } from './data-sources/mongo';
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

export interface EnrichedUser {
  id: string;
  email: string;
  name: string;
  groups: EnrichedGroup[];
}

export interface Group {
  id: string;
  slug: string;
  name: string;
  users: string[];
  creator: string;
  options: {};
}

export interface EnrichedGroup {
  id: string;
  slug: string;
  name: string;
  users: EnrichedUser[];
  creator: EnrichedUser;
  options: {};
}

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

  type Invite {
    user: User
    group: Group
  }

  type LoginCode {
    code: String
    user: User
    exp: Date
  }

  type GroupOptions {
    matchDate: Date
  }

  type Group {
    id: ID!
    slug: String!
    name: String!
    users: [User]!
    creator: User
    options: GroupOptions!
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

  type Mutation {
    createGroup(creator: UserInput!, invitees: [UserInput]!): Group
    createLoginCode(email: String!): Boolean
    updateUser(email: String!, update: UserUpdate!): User
    setGroupName(slug: String!, name: String!): Group
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
      return value.getTime();
    },
    parseLiteral(ast: ValueNode) {
      if (ast.kind === Kind.INT) {
        return new Date(ast.value);
      }
      return null;
    }
  })
};
