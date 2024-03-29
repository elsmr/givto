import {
  MongoGroups,
  MongoLoginCodes,
  MongoUsers,
} from '@givto/api/data-sources/mongo';
import {
  GivtoDataSources,
  scalarResolvers,
  typeDefs,
} from '@givto/api/graphql-schema';
import { contextFactory } from '@givto/api/graphql/context.factory';
import { addUsersToGroup } from '@givto/api/graphql/mutations/add-users-group.mutation';
import { addWishlistItem } from '@givto/api/graphql/mutations/add-wishlist-item.mutation';
import { createGroup } from '@givto/api/graphql/mutations/create-group.mutation';
import { createLoginCode } from '@givto/api/graphql/mutations/create-login-code.mutation';
import { deleteWishlistItem } from '@givto/api/graphql/mutations/delete-wishlist-item.mutation';
import { editWishlistItem } from '@givto/api/graphql/mutations/edit-wishlist-item.mutation';
import { reorderWishlistItem } from '@givto/api/graphql/mutations/reorder-wishlist-item.mutation';
import { setGroupName } from '@givto/api/graphql/mutations/set-group-name.mutation';
import { updateUser } from '@givto/api/graphql/mutations/update-user.mutation';
import { getCurrentUser } from '@givto/api/graphql/queries/get-current-user.query';
import { getGroup } from '@givto/api/graphql/queries/get-group.query';
import { getLoginCode } from '@givto/api/graphql/queries/get-login-code.query';
import { groupResolver } from '@givto/api/graphql/resolvers/group.resolver';
import { loginCodeResolver } from '@givto/api/graphql/resolvers/login-code.resolver';
import { userResolver } from '@givto/api/graphql/resolvers/user.resolver';
import * as Sentry from '@sentry/node';
import { ApolloServer } from 'apollo-server-micro';
import { NextApiRequest, NextApiResponse } from 'next';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV !== 'development',
});

const resolvers = {
  ...scalarResolvers,
  Query: {
    getCurrentUser,
    getGroup,
    getLoginCode,
  },
  Group: groupResolver,
  User: userResolver,
  LoginCode: loginCodeResolver,
  Mutation: {
    updateUser,
    setGroupName,
    createGroup,
    createLoginCode,
    addWishlistItem,
    editWishlistItem,
    deleteWishlistItem,
    reorderWishlistItem,
    addUsersToGroup,
  },
};

const dataSources: () => GivtoDataSources = () => {
  return {
    users: new MongoUsers(),
    groups: new MongoGroups(),
    loginCodes: new MongoLoginCodes(),
  };
};

const isDev = process.env.NODE_ENV === 'development';

const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  dataSources: dataSources as any,
  debug: isDev,
  introspection: isDev,
  context: contextFactory,
  formatError: (error) => {
    Sentry.captureException(error);
    return error;
  },
});

const startServer = apolloServer.start();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await startServer;
  await apolloServer.createHandler({
    path: '/api/graphql',
  })(req, res);
}

export const config = {
  api: {
    bodyParser: false,
  },
};
