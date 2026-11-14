import { ObjectId } from 'mongodb';
import { champions } from '../../guess-results';
import type { Edition } from '../../schema/edition';
import type { Group } from '../../schema/group';
import type { Member } from '../../schema/member';
import { boardPeople } from '../between/boards';
import type { Collections } from '../db';
import { drawParticipantIds } from '../draw/rules';
import { guessingOn } from '../guess/guesses';
import { suppressedEmails } from '../mail/suppression';

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

type EditionListItem = Pick<Edition, 'number' | 'title' | 'kind' | 'status' | 'results'>;

export const groupView = async (
  db: Collections,
  group: Group,
  me: Member,
  edition: Edition | null,
  editions: EditionListItem[]
) => {
  const isOrganizer = me.role === 'organizer';
  const participantIds = edition ? drawParticipantIds(group, edition) : [];
  // A done edition shows everyone who was in it, also those who left the group since (100).
  const wasIn = new Set(edition?.status === 'done' ? participantIds : []);
  const visible = group.members.filter(
    (m) => wasIn.has(m.id) || (isOrganizer ? m.status !== 'removed' : m.status === 'joined' || m.status === 'invited')
  );
  const emails = isOrganizer ? await memberEmails(db, group) : new Map<string, string>();
  const bounced = isOrganizer ? await suppressedEmails(db, [...emails.values()]) : new Set<string>();
  const nameOf = (memberId: string) => group.members.find((m) => m.id === memberId)?.name ?? '?';
  return {
    slug: group.slug,
    name: group.name,
    locale: group.locale,
    timeZone: group.timeZone,
    /** `hasBoards`: a conspiracy (90) shows me other people's boards. */
    me: { memberId: me.id, isOrganizer, hasBoards: Boolean(edition && boardPeople(group, edition, me).length > 0) },
    members: visible.map((m) => ({
      id: m.id,
      name: m.name,
      avatarColor: m.avatarColor,
      role: m.role,
      status: m.status,
      ...(isOrganizer && { email: emails.get(m.id), bounced: bounced.has(emails.get(m.id) ?? '') }),
    })),
    joinedCount: group.members.filter((m) => m.status === 'joined').length,
    /** Newest first; the group home lists them once there's history (33). `champions`: names, shared on a tie (86). */
    editions: editions.map(({ number, title, kind, status, results }) => ({
      number,
      title,
      kind: kind ?? 'secretSanta',
      status,
      champions: results ? champions(results.points).map(nameOf) : [],
    })),
    edition: edition && {
      number: edition.number,
      isCurrent: edition.number === editions[0]?.number,
      year: edition.year,
      title: edition.title,
      kind: edition.kind ?? 'secretSanta',
      status: edition.status,
      timeZone: group.timeZone,
      giftDay: edition.giftDay,
      drawAt: edition.drawAt,
      wishlistBy: edition.wishlistBy,
      postBy: edition.postBy,
      exchangeMode: edition.exchangeMode,
      budget: edition.budget,
      notes: edition.notes,
      avoidPreviousGiftees: edition.avoidPreviousGiftees,
      /** Guess your Santa (62) on: each person's Santa is shown at their turn. */
      guessing: guessingOn(edition),
      /** The big reveal (31) on: who was whose Santa comes out after the gifts. */
      reveal: edition.reveal.enabled,
      hasPreviousEdition: Boolean(edition.previousEditionId),
      calendarSequence: edition.calendarSequence ?? 0,
      participantIds,
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
        }
      : undefined,
  };
};
