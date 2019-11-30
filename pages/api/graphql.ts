import {
  MongoGroups,
  MongoLoginCodes,
  MongoUsers
} from '@givto/api/data-sources/mongo';
import {
  GivtoContext,
  GivtoDataSources,
  scalarResolvers,
  typeDefs
} from '@givto/api/graphql-schema';
import { contextFactory } from '@givto/api/graphql/context.factory';
import { createGroup } from '@givto/api/graphql/mutations/create-group.mutation';
import { createLoginCode } from '@givto/api/graphql/mutations/create-login-code.mutation';
import { setGroupName } from '@givto/api/graphql/mutations/set-group-name.mutation';
import { updateUser } from '@givto/api/graphql/mutations/update-user.mutation';
import { getCurrentUser } from '@givto/api/graphql/queries/get-current-user.query';
import { getGroup } from '@givto/api/graphql/queries/get-group.query';
import { getLoginCode } from '@givto/api/graphql/queries/get-login-code.query';
import { groupResolver } from '@givto/api/graphql/resolvers/group.resolver';
import { loginCodeResolver } from '@givto/api/graphql/resolvers/login-code.resolver';
import { userResolver } from '@givto/api/graphql/resolvers/user.resolver';
import { ApolloServer, IResolvers } from 'apollo-server-micro';

const resolvers: IResolvers<any, GivtoContext> = {
  ...scalarResolvers,
  Query: {
    getCurrentUser,
    getGroup,
    getLoginCode
  },
  Group: groupResolver,
  User: userResolver,
  LoginCode: loginCodeResolver,
  Mutation: {
    updateUser,
    setGroupName,
    createGroup,
    createLoginCode
  }
};

const dataSources: () => GivtoDataSources = () => {
  return {
    users: new MongoUsers(),
    groups: new MongoGroups(),
    loginCodes: new MongoLoginCodes()
  };
};

const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  dataSources: dataSources as any,
  tracing: process.env.NODE_ENV === 'development',
  introspection: process.env.NODE_ENV === 'development',
  context: contextFactory
});

export const config = {
  api: {
    bodyParser: false
  }
};

export default apolloServer.createHandler({ path: '/api/graphql' });
