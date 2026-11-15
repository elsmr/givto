import { createHash, randomBytes } from 'node:crypto';
import { ObjectId } from 'mongodb';
import { isDrawn } from '../schema/edition';
import type { Group } from '../schema/group';
import type { Member } from '../schema/member';
import type { Collections } from './db';
import { AppError } from './errors';
import { slotInLateJoiner } from './draw/patch';

/** URL-safe random token; 18 bytes = 24 chars. */
export const randomToken = (bytes = 18): string => randomBytes(bytes).toString('base64url');

export const hashToken = (token: string): string => createHash('sha256').update(token).digest('base64url');

export const firstName = (name: string): string => name.split(/\s+/)[0];

export const ownerOf = (group: Group): Member | undefined => group.members.find((m) => m.role === 'owner');

/** Statuses that hold a place in the group (member cap, 45). */
export const placeHolding: Member['status'][] = ['joined', 'requested'];

/** An email invitee who hasn't joined: no account, not managed, and their email for a name (110). */
export const invitedAs = (email: string) => ({ name: email, userId: { $exists: false }, managedBy: { $exists: false } });
export const isInvitedAs = (email: string) => (m: Member) => m.name === email && !m.userId && !m.managedBy;

/** The newest edition: the one the group home shows. */
export const currentEdition = (db: Collections, groupId: string) =>
  db.editions.findOne({ groupId }, { sort: { number: -1 } });

/**
 * Joining the group also joins its current edition (45), unless that one is over. After the
 * draw, the joiner is slotted into it (late joiners, PLAN-v2), unless they left it after the draw
 * (declined there): they sit it out (105).
 */
export const addToCurrentEdition = async (db: Collections, groupId: string, memberId: string) => {
  const edition = await currentEdition(db, groupId);
  if (!edition || edition.status === 'done') return;
  const now = new Date();
  const rejoined = await db.editions.updateOne(
    { _id: edition._id, participants: { $elemMatch: { memberId, status: { $ne: 'declined' } } } },
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

/** Two names that read the same (105): case and spaces aside. */
const sameName = (a: string, b: string) => a.replace(/\s+/g, '').toLowerCase() === b.replace(/\s+/g, '').toLowerCase();

/** Someone else in the group (joined or asking to join) already goes by this name. */
export const nameTaken = (group: Group, name: string, exceptMemberId?: string) =>
  group.members.some((m) => m.id !== exceptMemberId && placeHolding.includes(m.status) && sameName(m.name, name));

/**
 * Name and avatar colour live on the account; members carry a copy that `account.setName` / `setAvatarColor` keep in
 * sync. Accounts start without a name (sign-in by email doesn't ask), so `givenName` is needed until the account has
 * one. When the account's name is `taken` in the group, `givenName` is this group's own name for them (105); a taken
 * name is refused either way. No `avatarColor` key without a pick: the driver would store `undefined` as null.
 */
export const memberProfile = async (
  db: Collections,
  userId: string,
  givenName: string | undefined,
  taken: (name: string) => boolean = () => false
): Promise<Pick<Member, 'name' | 'avatarColor'>> => {
  const user = await db.users.findOne({ _id: new ObjectId(userId) }, { projection: { name: 1, avatarColor: 1 } });
  const color = user?.avatarColor ? { avatarColor: user.avatarColor } : {};
  const name = user?.name && !(givenName && taken(user.name)) ? user.name : givenName;
  if (!name) throw new AppError('NAME_REQUIRED');
  if (taken(name)) throw new AppError('NAME_TAKEN');
  if (!user?.name) await db.users.updateOne({ _id: new ObjectId(userId), name: '' }, { $set: { name, updatedAt: new Date() } });
  return { name, ...color };
};
