import {
  getMongoDb,
  MongoLoginCodes,
  MongoRefreshTokens,
  MongoUsers,
} from '@givto/api/data-sources/mongo';
import JWT from 'jsonwebtoken';
import ms from 'ms';
import { NextApiRequest, NextApiResponse } from 'next';

interface LoginPayload {
  loginCode: string;
  email: string;
}

const isValidPayload = (body: object): body is LoginPayload => {
  return (
    body &&
    typeof (body as any).loginCode === 'string' &&
    typeof (body as any).email === 'string'
  );
};

const getDataSources = async (): Promise<{
  loginCodes: MongoLoginCodes;
  refreshTokens: MongoRefreshTokens;
  users: MongoUsers;
}> => {
  const db = await getMongoDb(
    process.env.MONGODB_URI as string,
    process.env.MONGODB_DB as string
  );
  const loginCodes = new MongoLoginCodes();
  const refreshTokens = new MongoRefreshTokens();
  const users = new MongoUsers();
  loginCodes.initialize({ context: { db } });
  refreshTokens.initialize({ context: { db } });
  users.initialize({ context: { db } });

  return { loginCodes, refreshTokens, users };
};

export const loginHandler = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
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

      if (!user || user.email !== body.email) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const exp = Date.now() + ms('1d');
      const token = JWT.sign(
        { role: 'user', email: user.email },
        process.env.JWT_SECRET_KEY as string,
        {
          issuer: 'givto.app',
          expiresIn: '1d',
          subject: userId,
        }
      );

      const refreshToken = await refreshTokens.create(user._id);
      console.log(refreshToken);
      res.setHeader(
        'Set-Cookie',
        `refresh_token=${refreshToken.token};Expires=${new Date(
          refreshToken.exp
        ).toUTCString()};HttpOnly${
          process.env.NODE_ENV === 'development' ? '' : ';secure'
        }`
      );

      res.json({ token, exp, redirectUrl: loginCode.redirectUrl });
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  } else {
    res.status(400).json({ error: 'Invalid Body' });
  }
};
