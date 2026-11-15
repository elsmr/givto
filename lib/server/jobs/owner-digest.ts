import { ObjectId } from 'mongodb';
import { createElement } from 'react';
import { isDuplicateKey, type Collections } from '../db';
import { requireEnv } from '../env';
import { sendMail } from '../mail';
import { isoDate } from './dates';

const DAY = 24 * 60 * 60 * 1000;
const KIND = 'ownerDigest';

/**
 * Emails OWNER_EMAIL the groups created since the last digest: at most once a day, and only when
 * there are any. The last digest's `sentAt` is where the next one starts, so a day without a run
 * or with a failed send is covered by the next.
 */
export const sendOwnerDigest = async (db: Collections, now: Date) => {
  const to = process.env.OWNER_EMAIL;
  if (!to) return { skipped: true };
  const last = await db.sentNotifications.findOne({ kind: KIND }, { sort: { sentAt: -1 } });
  const since = last?.sentAt ?? new Date(now.getTime() - DAY);
  const groups = await db.groups
    .find({ createdAt: { $gt: since, $lte: now } }, { projection: { name: 1, createdBy: 1 }, sort: { createdAt: 1 } })
    .toArray();
  if (groups.length === 0) return { groupsCreated: 0 };

  const key = `${KIND}:${isoDate(now)}`;
  try {
    await db.sentNotifications.insertOne({ _id: key, kind: KIND, sentAt: now });
  } catch (error) {
    if (isDuplicateKey(error)) return { groupsCreated: groups.length, duplicate: true };
    throw error;
  }
  const userIds = groups.map((group) => group.createdBy).filter((id) => ObjectId.isValid(id));
  const users = await db.users
    .find({ _id: { $in: userIds.map((id) => new ObjectId(id)) } }, { projection: { email: 1 } })
    .toArray();
  const emails = new Map(users.map((user) => [user._id.toHexString(), user.email]));
  const count = `${groups.length} new group${groups.length === 1 ? '' : 's'}`;
  const host = new URL(requireEnv('BETTER_AUTH_URL')).host;
  const body = createElement(
    'div',
    null,
    createElement('p', null, `${count} on ${host} since ${since.toISOString()}:`),
    ...groups.map((group) => createElement('p', null, `${group.name} — ${emails.get(group.createdBy) ?? '(account deleted)'}`))
  );
  try {
    await sendMail({ to, subject: `Givto: ${count}`, body, tag: KIND });
  } catch (error) {
    await db.sentNotifications.deleteOne({ _id: key });
    throw error;
  }
  return { groupsCreated: groups.length };
};
