import {
  getMongoDb,
  MongoLoginCodes,
  MongoRefreshTokens,
  MongoUsers
} from '@givto/api/data-sources/mongo';
import JWT from 'jsonwebtoken';
import { NextApiRequest, NextApiResponse } from 'next';

interface LoginPayload {
  loginCode: string;
}

const isValidPayload = (body: object): body is LoginPayload => {
  return body && typeof (body as any).loginCode === 'string';
};

const getDataSources = async (): Promise<{
  loginCodes: MongoLoginCodes;
  refreshTokens: MongoRefreshTokens;
  users: MongoUsers;
}> => {
  const db = await getMongoDb(process.env.MONGODB_URI, process.env.MONGODB_DB);
  const loginCodes = new MongoLoginCodes();
  const refreshTokens = new MongoRefreshTokens();
  const users = new MongoUsers();
  loginCodes.initialize({ context: { db } });
  refreshTokens.initialize({ context: { db } });
  users.initialize({ context: { db } });

  return { loginCodes, refreshTokens, users };
};

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const { body, method } = req;

  if (method !== 'POST') {
    return res.status(405).send({});
  }

  if (isValidPayload(body)) {
    const { loginCodes, refreshTokens, users } = await getDataSources();
    const loginCode = await loginCodes.findByCode(body.loginCode);

    if (loginCode && loginCode.exp > Date.now()) {
      const userId = loginCode.userId.toHexString();
      const user = await users.findById(userId);

      if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const token = JWT.sign(
        { role: 'user', email: user.email },
        process.env.JWT_SECRET_KEY,
        {
          issuer: 'givto.app',
          expiresIn: '1h',
          subject: userId
        }
      );

      await Promise.all([
        loginCodes.deleteAllByUser(user._id),
        refreshTokens.deleteAllByUser(user._id)
      ]);

      const refreshToken = await refreshTokens.create(user._id);
      res.setHeader(
        'Set-Cookie',
        `refresh_token=${refreshToken};secure;HttpOnly`
      );

      res.json({ token });
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  } else {
    res.status(400).json({ error: 'Invalid Body' });
  }
};
