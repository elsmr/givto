import { ReminderGiftDayEmail, reminderGiftDaySubject } from '../../../emails/reminder-gift-day';
import { ReminderGiftEmail, reminderGiftSubject } from '../../../emails/reminder-gift';
import { ReminderWishlistEmail, reminderWishlistSubject } from '../../../emails/reminder-wishlist';
import { formatLocalDate } from '../../../emails/ui/format-date';
import { siteUrl } from '../../../emails/ui/site';
import { daysBetween, todayIn } from '../../local-date';
import type { Edition } from '../../schema/edition';
import type { Group } from '../../schema/group';
import type { Member } from '../../schema/member';
import type { Collections } from '../db';
import { sendNotice } from '../mail/notice';
import { memberRecipient, type Recipient } from '../mail/recipients';
import { groupUrl } from '../mail/urls';
import { visibleWishes } from '../wishlist/wish-view';
import { sendJoinReminders } from './join-reminders';
import { addCounts, runEach, type JobCounts } from './run-each';

/** Days ahead each reminder starts (28, 29); it goes out on the first tick in that window, once. */
const WISHLIST_DAYS_BEFORE_GIFT_DAY = 14;
const WISHLIST_DAYS_BEFORE_DEADLINE = 3;
const GIFT_DAYS_BEFORE = 7;
const POST_DAYS_BEFORE = 2;
/** Gift day reminders go out in the morning, local time. */
const GIFT_DAY_HOURS = { from: 7, to: 12 };

const localHour = (now: Date, timeZone: string) =>
  Number(new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' }).format(now));

const inWindow = (days: number, from: number, to: number) => days >= from && days <= to;

/** Reminders for one edition with a gift day, by where it is in its timeline. */
const editionReminders = async (db: Collections, group: Group, edition: Edition & { giftDay: NonNullable<Edition['giftDay']> }, now: Date) => {
  const today = todayIn(edition.timeZone, now);
  const toGiftDay = daysBetween(today, edition.giftDay.date);
  const participants = edition.participants.filter((p) => p.participates && p.status === 'joined');
  const members = (ids: string[]) => group.members.filter((m) => ids.includes(m.id) && m.status === 'joined');
  const props = (to: Recipient) => ({ locale: to.locale, group: group.name, url: groupUrl(to.locale, group.slug), forName: to.forName });
  const remind = (kind: string, people: Member[], send: (member: Member, to: Recipient, key: string) => Promise<string>) =>
    runEach(kind, people, async (member) => {
      const to = await memberRecipient(db, group, member);
      return to ? send(member, to, `reminder:${kind}:${edition._id}:${member.id}`) : 'noRecipient';
    });
  const notice = { groupId: group._id, editionId: edition._id, category: 'reminders' as const };
  const counts: JobCounts[] = [];

  const wishlistDays = edition.wishlistBy ? daysBetween(today, edition.wishlistBy) : toGiftDay;
  const wishlistLead = edition.wishlistBy ? WISHLIST_DAYS_BEFORE_DEADLINE : WISHLIST_DAYS_BEFORE_GIFT_DAY;
  if ((edition.status === 'open' || edition.status === 'drawn') && toGiftDay > 0 && inWindow(wishlistDays, 0, wishlistLead)) {
    const empty: Member[] = [];
    for (const member of members(participants.map((p) => p.memberId))) {
      if ((await visibleWishes(db, member)).length === 0) empty.push(member);
    }
    counts.push(await remind('wishlist', empty, (member, to, key) =>
      sendNotice(db, { ...notice, key, kind: 'reminderWishlist', to, memberId: member.id, render: (unsubscribe) => {
        const p = { ...props(to), unsubscribe, url: to.forName ? groupUrl(to.locale, group.slug) : siteUrl(to.locale, '/wishlist'), by: edition.wishlistBy && formatLocalDate(edition.wishlistBy, to.locale) };
        return { subject: reminderWishlistSubject(p), body: ReminderWishlistEmail(p) };
      } })));
  }

  const posted = edition.exchangeMode !== 'inPerson' && edition.postBy;
  const giftWindow = posted ? inWindow(daysBetween(today, posted), 0, POST_DAYS_BEFORE) : inWindow(toGiftDay, 1, GIFT_DAYS_BEFORE);
  if (edition.status === 'drawn' && toGiftDay > 0 && giftWindow) {
    counts.push(await remind('gift', members(Object.keys(edition.draw?.assignments ?? {})), (member, to, key) =>
      sendNotice(db, { ...notice, key, kind: posted ? 'reminderPost' : 'reminderGift', to, memberId: member.id, render: (unsubscribe) => {
        const p = { ...props(to), unsubscribe, giftDay: formatLocalDate(edition.giftDay.date, to.locale), postBy: posted ? formatLocalDate(posted, to.locale) : undefined };
        return { subject: reminderGiftSubject(p), body: ReminderGiftEmail(p) };
      } })));
  }

  const hour = localHour(now, edition.timeZone);
  if ((edition.status === 'drawn' || edition.status === 'giftday') && toGiftDay === 0 && hour >= GIFT_DAY_HOURS.from && hour < GIFT_DAY_HOURS.to) {
    // Managers hear it once, for themselves: not again per managed member.
    const people = members(participants.map((p) => p.memberId)).filter((m) => m.userId);
    counts.push(await remind('giftday', people, (member, to, key) =>
      sendNotice(db, { ...notice, key, kind: 'reminderGiftDay', to, memberId: member.id, render: (unsubscribe) => {
        const p = { ...props(to), unsubscribe, time: edition.giftDay.time, place: edition.giftDay.place };
        return { subject: reminderGiftDaySubject(p), body: ReminderGiftDayEmail(p) };
      } })));
  }
  return addCounts(...counts);
};

/** Deadline and gift day reminders (29); idempotent per edition, kind and member. Runs hourly. */
export const sendReminders = async (db: Collections, now: Date) => {
  const editions = await db.editions.find({ status: { $in: ['open', 'drawn', 'giftday'] }, giftDay: { $exists: true } }).toArray();
  const counts: JobCounts[] = [];
  for (const edition of editions) {
    const group = await db.groups.findOne({ _id: edition.groupId, deletedAt: { $exists: false } });
    if (group && edition.giftDay) counts.push(await editionReminders(db, group, { ...edition, giftDay: edition.giftDay }, now));
  }
  return { editions: addCounts(...counts), join: await sendJoinReminders(db, now) };
};
