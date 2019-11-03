import { ApolloServer, gql } from 'apollo-server-micro';

const isProduction = process.env.NODE_ENV !== 'production';

const typeDefs = gql`
  type Query {
    hello: String
  }
`;

const resolvers = {
  Query: {
    // hello: (root, args, context) => {
    hello: () => {
      return 'Hello world!';
    }
  }
};

console.log('Hello world!', process.env);

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: !isProduction,
  playground: !isProduction
});

export default server.createHandler({
  path: '/api/graphql'
});
