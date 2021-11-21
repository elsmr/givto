import { IncomingMessage } from 'http';
import { Auth } from '../auth';
import { getMongoDb } from '../data-sources/mongo';
import { GivtoContext } from '../graphql-schema';
import { Mailer } from '../mail';

export const contextFactory = async ({ req }: { req: IncomingMessage }) => {
  const auth = new Auth(req.headers.authorization);
  const mailer = new Mailer({
    apiKey: process.env.MAILGUN_API_KEY as string,
    baseUrl: process.env.MAILGUN_API_BASE as string,
    from: { email: 'no-reply@mail.givto.app', name: 'Givto' },
  });
  const db = await getMongoDb(
    process.env.MONGODB_URI as string,
    process.env.MONGODB_DB as string
  );

  return { db, auth, mailer } as GivtoContext;
};
