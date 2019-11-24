import { ApolloServer, IResolvers } from 'apollo-server-micro';
import { IncomingMessage } from 'http';
import { Auth } from '../../lib/api/auth';
import {
  getMongoDb,
  MongoGroups,
  MongoInvites,
  MongoLoginCodes,
  MongoUsers
} from '../../lib/api/data-sources/mongo';
import { mapGroup, mapLoginCode, mapUser } from '../../lib/api/graphql-mappers';
import {
  GivtoContext,
  GivtoDataSources,
  Group,
  LoginCode,
  scalarResolvers,
  typeDefs,
  User
} from '../../lib/api/graphql-schema';
import { Mailer } from '../../lib/api/mail';
import { generateSlug } from '../../lib/api/url-generator';

const resolvers: IResolvers<any, GivtoContext> = {
  ...scalarResolvers,
  Query: {
    async getGroup(
      _,
      { slug },
      { dataSources: { groups } }
    ): Promise<Group | null> {
      console.log('resolve group', slug);
      const mongoGroup = await groups.findBySlug(slug);
      if (!mongoGroup) {
        return null;
      }
      return mapGroup(mongoGroup);
    },

    async getLoginCode(
      _,
      { code },
      { dataSources: { loginCodes } }
    ): Promise<LoginCode | null> {
      console.log('resolve login code', code);
      const mongoCode = await loginCodes.findByCode(code);
      if (!mongoCode) {
        return null;
      }
      return mapLoginCode(mongoCode);
    }
  },
  Group: {
    async users(group: Group, _, { dataSources: { users } }): Promise<User[]> {
      console.log('resolve users for group', group.slug);
      const mongoUsers = await users.findByIds(group.users);
      return mongoUsers.map(mapUser);
    }
  },
  LoginCode: {
    async user(
      loginCode: LoginCode,
      _,
      { dataSources: { users } }
    ): Promise<User | null> {
      console.log('resolve users for loginCode', loginCode.code);
      const mongoUser = await users.findByEmail(loginCode.email);
      if (mongoUser) {
        return mapUser(mongoUser);
      }
      return null;
    }
  },
  Mutation: {
    async createGroup(
      _,
      { name },
      { dataSources: { groups } }
    ): Promise<Group | null> {
      const slug = await generateSlug(groups.hasSlug);
      const mongoGroup = await groups.createGroup({ name, slug, users: [] });
      return mongoGroup ? mapGroup(mongoGroup) : null;
    },

    async createLoginCode(
      _,
      { email },
      { dataSources: { users, loginCodes }, mailer }
    ): Promise<boolean> {
      const user = await users.findByEmail(email);

      if (user) {
        const loginCode = await loginCodes.create(user.email);
        mailer.sendMail({
          to: { name: user.name, email: user.email },
          subject: 'Givto Login Verification',
          text: `Your login code is "${loginCode}"`
        });
      }

      return true;
    }
  }
};

const dataSources: () => GivtoDataSources = () => {
  return {
    users: new MongoUsers('users'),
    groups: new MongoGroups('groups'),
    invites: new MongoInvites('invites'),
    loginCodes: new MongoLoginCodes('loginCodes')
  };
};

const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  dataSources: dataSources as any,
  tracing: process.env.NODE_ENV === 'development',
  introspection: process.env.NODE_ENV === 'development',
  context: async ({ req }: { req: IncomingMessage }) => {
    const auth = new Auth(req.headers.authorization);
    const mailer = new Mailer({
      apiKey: process.env.MAILGUN_API_KEY,
      baseUrl: process.env.MAILGUN_API_BASE,
      from: { email: 'no-reply@mail.givto.app', name: 'Givto' }
    });
    const db = await getMongoDb(
      process.env.MONGODB_URI,
      process.env.MONGODB_DB
    );

    return { db, auth, mailer };
  }
});

export const config = {
  api: {
    bodyParser: false
  }
};

export default apolloServer.createHandler({ path: '/api/graphql' });
