import {
  getMongoDb,
  MongoRefreshTokens,
  MongoUsers
} from '@givto/api/data-sources/mongo';
import JWT from 'jsonwebtoken';
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

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const { cookies, method } = req;

  if (method !== 'POST') {
    return res.status(405).send({});
  }

  if (cookies.refresh_token) {
    const { refreshTokens, users } = await getDataSources();
    const refreshToken = await refreshTokens.findByToken(cookies.refresh_token);

    if (refreshToken && refreshToken.exp > Date.now()) {
      const user = await users.findById(refreshToken.userId.toHexString());
      if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const token = JWT.sign(
        { role: 'user', email: user.email },
        process.env.JWT_SECRET_KEY,
        {
          issuer: 'givto.app',
          expiresIn: '2h',
          subject: user._id.toHexString()
        }
      );

      await refreshTokens.deleteAllByUser(refreshToken.userId);
      const newRefreshToken = await refreshTokens.create(refreshToken.userId);
      res.setHeader(
        'Set-Cookie',
        `refresh_token=${newRefreshToken};secure;HttpOnly`
      );

      res.json({ token });
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  } else {
    res.status(400).json({ error: 'Invalid Body' });
  }
};
