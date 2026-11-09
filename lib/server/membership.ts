import { createHash, randomBytes } from 'node:crypto';
import { ObjectId } from 'mongodb';
import type { Group } from '../schema/group';
import type { Member } from '../schema/member';
import type { Collections } from './db';
import { slotInLateJoiner } from './draw/patch';
import { isDrawn } from './draw/rules';

/** URL-safe random token; 18 bytes = 24 chars. */
export const randomToken = (bytes = 18): string => randomBytes(bytes).toString('base64url');

export const hashToken = (token: string): string => createHash('sha256').update(token).digest('base64url');

export const firstName = (name: string): string => name.split(/\s+/)[0];

export const organizerOf = (group: Group): Member | undefined =>
  group.members.find((m) => m.role === 'organizer');

/** Statuses that hold a place in the group (member cap, 45). */
export const placeHolding: Member['status'][] = ['joined', 'requested'];

/** The newest edition: the one the group home shows. */
export const currentEdition = (db: Collections, groupId: string) =>
  db.editions.findOne({ groupId }, { sort: { number: -1 } });

/**
 * Joining the group also joins its current edition (45), unless that one is over. After the
 * draw, the joiner is slotted into it (late joiners, PLAN-v2).
 */
export const addToCurrentEdition = async (db: Collections, groupId: string, memberId: string) => {
  const edition = await currentEdition(db, groupId);
  if (!edition || edition.status === 'done') return;
  const now = new Date();
  const rejoined = await db.editions.updateOne(
    { _id: edition._id, 'participants.memberId': memberId },
    {
      $set: {
        'participants.$.status': 'joined',
        'participants.$.participates': true,
        updatedAt: now,
      },
    }
  );
  if (rejoined.matchedCount === 0) {
    await db.editions.updateOne(
      { _id: edition._id, 'participants.memberId': { $ne: memberId } },
      {
        $push: { participants: { memberId, participates: true, status: 'joined', addedAt: now } },
        $set: { updatedAt: now },
      }
    );
  }
  if (isDrawn(edition)) await slotInLateJoiner(db, groupId, edition._id, memberId);
};

/** Accounts start without a name; the first name someone gives us when joining or creating sticks. */
export const nameUserIfUnnamed = (db: Collections, userId: string, name: string) =>
  db.users.updateOne(
    { _id: new ObjectId(userId), name: '' },
    { $set: { name, updatedAt: new Date() } }
  );
