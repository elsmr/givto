import { ReminderGiftDayEmail, reminderGiftDaySubject } from '../../../emails/reminder-gift-day';
import { ReminderEmail, reminderSubject, type ReminderParts } from '../../../emails/reminder';
import { siteUrl } from '../../../emails/ui/site';
import { daysBetween, formatLocalDate, hourIn, todayIn } from '../../local-date';
import { dueReminder, type DueReminder, type ReminderPart } from '../../reminder-schedule';
import { drawsNames, isDrawn, type Edition } from '../../schema/edition';
import type { Group } from '../../schema/group';
import type { Member } from '../../schema/member';
import type { Collections } from '../db';
import { drawParticipantIds } from '../draw/rules';
import { sendNotice } from '../mail/notice';
import { memberRecipient, type Recipient } from '../mail/recipients';
import { groupUrl } from '../mail/urls';
import { sendJoinDigests } from './join-digests';
import { declineExpiredInvitees, sendJoinReminders } from './join-reminders';
import { reminderEditionOf, reminderPeople } from './reminder-people';
import { addCounts, runEach, type JobCounts } from './run-each';

/** Gift day reminders go out in the morning, local time. */
const GIFT_DAY_HOURS = { from: 7, to: 12 };
const READY_SOON_DAYS = 14;

/** For tests (`reminders.runDue`): only these editions (reminders) and groups (join digests, expired invitees); invite reminders not at all. */
export interface ReminderScope {
  editionIds?: string[];
  groupIds?: string[];
}

const kindOf = (parts: ReminderPart[], posted: boolean) => {
  if (parts.length > 1) return 'reminderCombined';
  return { wishlist: 'reminderWishlist', address: 'reminderAddress', gift: posted ? 'reminderPost' : 'reminderGift', readyToDraw: 'reminderReadyToDraw' }[parts[0]];
};

/** The email for one due reminder: its parts, each with its own link. */
const reminderParts = (group: Group, edition: Edition, to: Recipient, { parts }: DueReminder, today: string): ReminderParts => {
  const date = (local: string | undefined) => local && formatLocalDate(local, to.locale);
  const home = groupUrl(group.slug);
  const giftDay = edition.giftDay?.date;
  const postBy = edition.exchangeMode !== 'inPerson' ? edition.postBy : undefined;
  const whiteElephant = edition.kind === 'whiteElephant';
  return {
    ...(parts.includes('wishlist') && { wishlist: { url: to.forName ? home : siteUrl(to.locale, '/wishlist'), by: date(edition.wishlistBy) } }),
    ...(parts.includes('address') && { address: { url: home, postBy: date(postBy) } }),
    ...(parts.includes('gift') &&
      giftDay && { gift: { url: whiteElephant ? home : `${home}#giftee`, giftDay: date(giftDay)!, postBy: date(postBy), whiteElephant } }),
    ...(parts.includes('readyToDraw') && {
      readyToDraw: {
        url: home,
        lockIn: !drawsNames(edition),
        people: drawParticipantIds(group, edition).length,
        giftDay: date(giftDay),
        soon: Boolean(giftDay && daysBetween(today, giftDay) <= READY_SOON_DAYS),
      },
    }),
  };
};

/** Wishlist, address, gift and ready-to-draw reminders by the schedule (lib/reminder-schedule.ts): at most one email a week per person. */
const scheduledReminders = async (db: Collections, group: Group, edition: Edition, now: Date) => {
  const today = todayIn(group.timeZone, now);
  const schedule = reminderEditionOf(edition, group.timeZone);
  const people = await reminderPeople(db, group, edition, now);
  return runEach('reminder', people, async ({ member, person, history }) => {
    const due = dueReminder(person, schedule, history, today);
    if (!due) return 'notDue';
    const to = await memberRecipient(db, group, member);
    if (!to) return 'noRecipient';
    return sendNotice(db, {
      key: `reminder:${edition._id}:${member.id}:${due.slots.join('+')}`,
      kind: kindOf(due.parts, Boolean(schedule.postBy)),
      to,
      category: 'reminders',
      groupId: group._id,
      editionId: edition._id,
      memberId: member.id,
      slots: due.slots,
      render: (unsubscribe) => {
        const props = { locale: to.locale, group: group.name, url: groupUrl(group.slug), forName: to.forName, unsubscribe, ...reminderParts(group, edition, to, due, today) };
        return { subject: reminderSubject(props), body: ReminderEmail(props) };
      },
    });
  });
};

/** The morning of gift day (29, 31), to everyone in the edition; not part of the weekly limit. */
const giftDayReminders = async (db: Collections, group: Group, edition: Edition, now: Date) => {
  if (!edition.giftDay || todayIn(group.timeZone, now) !== edition.giftDay.date) return {};
  const hour = hourIn(group.timeZone, now);
  if (!isDrawn(edition) || hour < GIFT_DAY_HOURS.from || hour >= GIFT_DAY_HOURS.to) return {};
  const ids = edition.participants.filter((p) => p.participates && p.status === 'joined').map((p) => p.memberId);
  // Managers hear it once, for themselves: not again per managed member.
  const people = group.members.filter((m): m is Member => ids.includes(m.id) && m.status === 'joined' && Boolean(m.userId));
  const { time, place, callUrl } = edition.giftDay;
  return runEach('giftday', people, async (member) => {
    const to = await memberRecipient(db, group, member);
    if (!to) return 'noRecipient';
    return sendNotice(db, {
      key: `reminder:giftday:${edition._id}:${member.id}`,
      kind: 'reminderGiftDay',
      to,
      category: 'reminders',
      groupId: group._id,
      editionId: edition._id,
      memberId: member.id,
      render: (unsubscribe) => {
        const p = { locale: to.locale, group: group.name, url: groupUrl(group.slug), unsubscribe, time, place, callUrl };
        return { subject: reminderGiftDaySubject(p), body: ReminderGiftDayEmail(p) };
      },
    });
  });
};

/** Reminders (29, 63), the organizer's join digest and expired invitees out (98); idempotent. Runs with every tick. */
export const sendReminders = async (db: Collections, now: Date, scope?: ReminderScope) => {
  const editions = await db.editions
    .find({ status: { $in: ['open', 'drawn', 'giftday'] }, ...(scope && { _id: { $in: scope.editionIds ?? [] } }) })
    .toArray();
  const counts: JobCounts[] = [];
  for (const edition of editions) {
    const group = await db.groups.findOne({ _id: edition.groupId, deletedAt: { $exists: false } });
    if (!group) continue;
    counts.push(await scheduledReminders(db, group, edition, now), await giftDayReminders(db, group, edition, now));
  }
  return {
    expiredInvitees: await declineExpiredInvitees(db, now, scope && (scope.groupIds ?? [])),
    editions: addCounts(...counts),
    join: scope ? {} : await sendJoinReminders(db, now),
    joinDigests: await sendJoinDigests(db, now, scope && (scope.groupIds ?? [])),
  };
};
