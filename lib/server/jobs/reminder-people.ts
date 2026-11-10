import { todayIn } from '../../local-date';
import type { ReminderEdition, ReminderPerson, SentReminder } from '../../reminder-schedule';
import type { Edition } from '../../schema/edition';
import { MIN_PARTICIPANTS, type Group } from '../../schema/group';
import type { Member } from '../../schema/member';
import type { Collections } from '../db';
import { currentGifts } from '../gift/marks';
import { visibleWishes } from '../wishlist/wish-view';

const later = (a: Date, b: Date) => (a > b ? a : b);

export const reminderEditionOf = (edition: Edition): ReminderEdition => ({
  status: edition.status,
  drawnOn: edition.draw?.drawnAt && todayIn(edition.timeZone, edition.draw.drawnAt),
  giftDay: edition.giftDay?.date,
  wishlistBy: edition.wishlistBy,
  postBy: edition.exchangeMode !== 'inPerson' ? edition.postBy : undefined,
});

/** Everyone invited by email this edition has joined, and nobody's invite is still pending (63). */
const everyoneInvitedIn = async (db: Collections, group: Group, openedAt: Date, now: Date) => {
  const invitedIds = group.members.filter((m) => m.status === 'invited').map((m) => m.id);
  const pending = await db.invites.countDocuments({ memberId: { $in: invitedIds }, usedAt: { $exists: false }, expiresAt: { $gt: now } }, { limit: 1 });
  const joinedThisTime = group.members.some((m) => m.status === 'joined' && m.invitedAt && m.joinedAt && m.joinedAt >= openedAt);
  return pending === 0 && joinedThisTime;
};

/**
 * The people of one edition as the reminder schedule sees them (lib/reminder-schedule.ts), with
 * their reminder history in the group: participants, and the organizer for ready-to-draw.
 */
export const reminderPeople = async (db: Collections, group: Group, edition: Edition, now: Date) => {
  const openedAt = edition.statusChangedAt.open ?? edition.createdAt;
  const local = (date: Date) => todayIn(edition.timeZone, date);
  const participants = edition.participants.filter((p) => p.participates && p.status === 'joined');
  const gifts = await currentGifts(db, edition);
  const manualDraw = edition.status === 'open' && !edition.drawAt && participants.length >= MIN_PARTICIPANTS;
  const everyoneIn = manualDraw && (await everyoneInvitedIn(db, group, openedAt, now));
  const sent = await db.sentNotifications.find({ groupId: group._id, slots: { $exists: true } }, { projection: { memberId: 1, editionId: 1, slots: 1, sentAt: 1 } }).toArray();
  const people: { member: Member; person: ReminderPerson; history: SentReminder[] }[] = [];
  for (const member of group.members.filter((m) => m.status === 'joined')) {
    const participant = participants.find((p) => p.memberId === member.id);
    const isOrganizer = member.role === 'organizer';
    if (!participant && !isOrganizer) continue;
    people.push({
      member,
      person: {
        joinedOn: local(later(participant?.addedAt ?? openedAt, openedAt)),
        // Not in this edition (an organizer sitting out): no wishlist reminders.
        wishCount: participant ? (await visibleWishes(db, member)).length : 1,
        isSanta: Boolean(edition.draw?.assignments[member.id]),
        hasGift: gifts.has(member.id),
        canDraw: isOrganizer && manualDraw,
        everyoneIn: isOrganizer && everyoneIn,
      },
      history: sent
        .filter((s) => s.memberId === member.id)
        .map((s) => ({ sentOn: local(s.sentAt), slots: s.editionId === edition._id ? (s.slots ?? []) : [] })),
    });
  }
  return people;
};
