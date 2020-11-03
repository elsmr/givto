import {
  getMongoDb,
  MongoRefreshTokens,
  MongoUsers,
} from '@givto/api/data-sources/mongo';
import JWT from 'jsonwebtoken';
import ms from 'ms';
import { NextApiRequest, NextApiResponse } from 'next';

const getDataSources = async (): Promise<{
  users: MongoUsers;
  refreshTokens: MongoRefreshTokens;
}> => {
  const db = await getMongoDb(process.env.MONGODB_URI, process.env.MONGODB_DB);
  const refreshTokens = new MongoRefreshTokens();
  const users = new MongoUsers();
  users.initialize({ context: { db } });
  refreshTokens.initialize({ context: { db } });

  return { refreshTokens, users };
};

export const refreshTokenHandler = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  const { cookies, method } = req;

  if (method !== 'POST') {
    return res.status(405).send({});
  }

  console.log('cookies here!', { cookies });
  if (cookies.refresh_token) {
    const { refreshTokens, users } = await getDataSources();
    const refreshToken = await refreshTokens.findByToken(cookies.refresh_token);
    console.log(refreshToken);

    if (refreshToken && refreshToken.exp > Date.now()) {
      const user = await users.findById(refreshToken.userId.toHexString());
      if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const exp = Date.now() + ms('1h');
      const token = JWT.sign(
        { role: 'user', email: user.email },
        process.env.JWT_SECRET_KEY,
        {
          issuer: 'givto.app',
          expiresIn: '1h',
          subject: user._id.toHexString(),
        }
      );

      const newRefreshToken = await refreshTokens.create(refreshToken.userId);
      res.setHeader(
        'Set-Cookie',
        `refresh_token=${newRefreshToken.token};Expires=${new Date(
          newRefreshToken.exp
        ).toUTCString()};HttpOnly${
          process.env.NODE_ENV === 'development' ? '' : ';secure'
        }`
      );

      res.json({ token, exp });
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  } else {
    res.status(400).json({ error: 'Invalid Body' });
  }
};
