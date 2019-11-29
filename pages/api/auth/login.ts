import { User } from '@givto/api/graphql-schema';
import { GraphQLClient } from 'graphql-request';
import JWT from 'jsonwebtoken';
import { NextApiRequest, NextApiResponse } from 'next';

const client = new GraphQLClient(`${process.env.APP_HOST}/api/graphql`);

const getLoginCodeQuery = `query getLoginCode($loginCode: String!) {
    getLoginCode(code: $loginCode) {
      exp
      user {
        id,
        email
      }
    }
  }`;

interface Payload {
  loginCode: string;
}

interface LoginCodeResponse {
  getLoginCode: { user: User; exp: number };
}

const isValidPayload = (body: object): body is Payload => {
  return body && typeof (body as any).loginCode === 'string';
};

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const { body, method } = req;

  if (method !== 'POST') {
    return res.status(405).send({});
  }

  console.log(body);

  if (isValidPayload(body)) {
    const { getLoginCode: loginCode }: LoginCodeResponse = await client.request(
      getLoginCodeQuery,
      {
        loginCode: body.loginCode
      }
    );
    if (loginCode && loginCode.user && loginCode.exp > Date.now()) {
      const token = JWT.sign(
        { role: 'user', email: loginCode.user.email },
        process.env.JWT_SECRET_KEY,
        {
          issuer: 'givto.app',
          expiresIn: '1h',
          subject: loginCode.user.id
        }
      );

      // const refreshToken = await client.request(createRefreshToken);
      // res.setHeader(
      //   'Set-Cookie',
      //   `refresh_token=${refreshToken};secure;HttpOnly`
      // );

      res.json({ token });
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  } else {
    res.status(400).json({ error: 'Invalid Body' });
  }
};
