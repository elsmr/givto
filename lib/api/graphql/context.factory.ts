import { IncomingMessage } from 'http';
import { Auth } from '../auth';
import { getMongoDb } from '../data-sources/mongo';
import { GivtoContext } from '../graphql-schema';
import { Mailer } from '../mail';

export const contextFactory = async ({ req }: { req: IncomingMessage }) => {
  const auth = new Auth(req.headers.authorization);
  const mailer = new Mailer({
    apiKey: process.env.MAILGUN_API_KEY,
    baseUrl: process.env.MAILGUN_API_BASE,
    from: { email: 'no-reply@mail.givto.app', name: 'Givto' }
  });
  const db = await getMongoDb(process.env.MONGODB_URI, process.env.MONGODB_DB);

  return { db, auth, mailer } as GivtoContext;
};
