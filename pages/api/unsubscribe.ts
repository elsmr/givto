import { ObjectId } from 'mongodb';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../lib/server/db';
import { readUnsubscribeToken } from '../../lib/server/mail/unsubscribe';

/**
 * One-click unsubscribe (RFC 8058): mail clients POST here from the List-Unsubscribe header,
 * and /unsubscribe's button does too. GET never changes anything (link scanners follow links).
 */
export default async function unsubscribeHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).end();
    return;
  }
  const token = readUnsubscribeToken(String(req.query.t ?? ''));
  if (!token) {
    res.status(400).json({ ok: false });
    return;
  }
  const { users } = await getDb();
  await users.updateOne(
    { _id: new ObjectId(token.userId) },
    { $set: { [`notifications.${token.category}`]: false, updatedAt: new Date() } }
  );
  res.status(200).json({ ok: true, category: token.category });
}
