import { loginHandler } from '@givto/api/auth/handlers/login';
import { logoutHandler } from '@givto/api/auth/handlers/logout';
import { refreshTokenHandler } from '@givto/api/auth/handlers/refresh';
import { NextApiRequest, NextApiResponse } from 'next';

export default async (req: NextApiRequest, res: NextApiResponse) => {
  switch (req.query.action) {
    case 'login':
      loginHandler(req, res);
      break;
    case 'logout':
      logoutHandler(req, res);
      break;
    case 'refresh':
      refreshTokenHandler(req, res);
      break;
    default:
      res.status(400).json({ error: 'Invalid Action' });
  }
};
