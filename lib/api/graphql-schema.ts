import { gql } from 'apollo-server-micro';
import { GraphQLScalarType, Kind, ValueNode } from 'graphql';
import { Db } from 'mongodb';
import {
  MongoGroups,
  MongoInvites,
  MongoLoginCodes,
  MongoUsers
} from './data-sources/mongo';
import { Mailer } from './mail';

export interface Invite {
  id: string;
  invitee: string;
  group: string;
}

export interface LoginCode {
  code: string;
  email: string;
  exp: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  groups: string[];
}

export interface Group {
  id: string;
  slug: string;
  name: string;
  users: string[];
  options: {};
}

export interface GivtoContext {
  dataSources: GivtoDataSources;
  db: Db;
  mailer: Mailer;
  token: string;
}

export interface GivtoDataSources {
  users: MongoUsers;
  invites: MongoInvites;
  groups: MongoGroups;
  loginCodes: MongoLoginCodes;
}

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
    options: GroupOptions!
  }

  type User {
    id: ID!
    name: String!
    email: String!
    groups: [Group]!
  }

  type Query {
    getGroup(slug: String!): Group
    getLoginCode(code: String!): LoginCode
  }

  type Mutation {
    createGroup(name: String!): Group
    createLoginCode(email: String!): Boolean
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
