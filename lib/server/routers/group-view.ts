import { ObjectId } from 'mongodb';
import { toKeepApartPairs } from '../../exclusions';
import type { Edition } from '../../schema/edition';
import type { Group } from '../../schema/group';
import type { Member } from '../../schema/member';
import type { Collections } from '../db';

/** Organizer only (privacy rules): emails of accounts, or of pending email invites. */
const memberEmails = async (db: Collections, group: Group): Promise<Map<string, string>> => {
  const userIds = group.members.flatMap((m) => (m.userId ? [new ObjectId(m.userId)] : []));
  const [users, invites] = await Promise.all([
    db.users.find({ _id: { $in: userIds } }, { projection: { email: 1 } }).toArray(),
    db.invites.find({ groupId: group._id }, { projection: { memberId: 1, email: 1 } }).toArray(),
  ]);
  const byUserId = new Map(users.map((u) => [u._id.toHexString(), u.email]));
  const byMemberId = new Map(invites.map((i) => [i.memberId, i.email]));
  return new Map(
    group.members.flatMap((m) => {
      const email = (m.userId && byUserId.get(m.userId)) || byMemberId.get(m.id);
      return email ? [[m.id, email]] : [];
    })
  );
};

export const groupView = async (db: Collections, group: Group, me: Member, edition: Edition | null) => {
  const isOrganizer = me.role === 'organizer';
  const visible = group.members.filter((m) =>
    isOrganizer ? m.status !== 'removed' : m.status === 'joined'
  );
  const emails = isOrganizer ? await memberEmails(db, group) : new Map<string, string>();
  return {
    slug: group.slug,
    name: group.name,
    me: { memberId: me.id, isOrganizer },
    members: visible.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      status: m.status,
      ...(isOrganizer && { email: emails.get(m.id) }),
    })),
    joinedCount: group.members.filter((m) => m.status === 'joined').length,
    edition: edition && {
      number: edition.number,
      title: edition.title,
      status: edition.status,
      timeZone: edition.timeZone,
      giftDay: edition.giftDay,
      exchangeMode: edition.exchangeMode,
      budget: edition.budget,
      participantIds: edition.participants
        .filter((p) => p.participates && p.status === 'joined')
        .map((p) => p.memberId),
    },
    organizer: isOrganizer
      ? {
          joinLink: group.joinLink && {
            token: group.joinLink.token,
            revoked: group.joinLink.revoked,
            requiresApproval: group.joinLink.requiresApproval,
            maxMembers: group.joinLink.maxMembers,
          },
          households: group.households.map((h) => h.memberIds),
          keepApartPairs: toKeepApartPairs(group.exclusions),
        }
      : undefined,
  };
};
