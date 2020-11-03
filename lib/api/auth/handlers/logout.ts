import { getMongoDb, MongoRefreshTokens } from '@givto/api/data-sources/mongo';
import JWT from 'jsonwebtoken';
import { ObjectID } from 'mongodb';
import { NextApiRequest, NextApiResponse } from 'next';

const getDataSources = async (): Promise<{
  refreshTokens: MongoRefreshTokens;
}> => {
  const db = await getMongoDb(process.env.MONGODB_URI, process.env.MONGODB_DB);
  const refreshTokens = new MongoRefreshTokens();
  refreshTokens.initialize({ context: { db } });

  return { refreshTokens };
};

export const logoutHandler = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  const { headers, method } = req;

  if (method !== 'POST') {
    return res.status(405).send({});
  }

  const authHeader = headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];
    const { refreshTokens } = await getDataSources();
    try {
      console.log('verifying');
      const claims = JWT.verify(token, process.env.JWT_SECRET_KEY) as {
        sub: string;
      };
      refreshTokens.deleteAllByUser(new ObjectID(claims.sub));
    } catch (e) {
      console.log('bad jwt', e);
      // Bad JWT, do nothing
    }
  }
  res.setHeader(
    'Set-Cookie',
    `refresh_token=;max-age=0;HttpOnly${
      process.env.NODE_ENV === 'development' ? '' : ';secure'
    }`
  );
  res.status(200).send({});
};
