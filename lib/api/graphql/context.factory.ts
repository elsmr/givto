import { NextApiRequest, NextApiResponse } from 'next';
import { Auth } from '../auth';
import { getMongoDb } from '../data-sources/mongo';
import { GivtoContext, GivtoDataSources } from '../graphql-schema';
import { Mailer } from '../mail';

export const contextFactory = async ({
  req,
  res,
  dataSources
}: {
  req: NextApiRequest;
  res: NextApiResponse;
  dataSources: GivtoDataSources;
}): Promise<GivtoContext> => {
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

  // Initialize data sources with db context
  dataSources.users.initialize({ context: { db } });
  dataSources.groups.initialize({ context: { db } });
  dataSources.loginCodes.initialize({ context: { db } });

  return { db, auth, mailer, dataSources };
};
