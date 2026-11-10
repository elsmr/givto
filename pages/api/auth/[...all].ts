import { toNodeHandler } from 'better-auth/node';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '../../../lib/server/auth';

// Better Auth reads the raw body itself.
export const config = { api: { bodyParser: false } };

export default function authHandler(req: NextApiRequest, res: NextApiResponse) {
  return toNodeHandler(getAuth())(req, res);
}
