// Pure: which reminder email (63) one person gets for one edition today, if any. Dates are local
// dates (YYYY-MM-DD) in the group's time zone. The job (lib/server/jobs/reminders.ts) runs it every
// tick; tests/reminder-schedule.check.mjs plays it day by day.
import { addDays, daysBetween } from './local-date';
import type { EditionStatus } from './schema/edition';

export type ReminderPart = 'wishlist' | 'address' | 'gift' | 'readyToDraw';
const parts: ReminderPart[] = ['wishlist', 'address', 'gift', 'readyToDraw'];

export interface ReminderPerson {
  /** The later of being added to the edition and the edition opening. */
  joinedOn: string;
  /** Wishes their Santa sees in this group: none = wishlist reminders. */
  wishCount: number;
  /** A Santa in this edition's draw, or anyone in a white elephant (88): brings a gift. */
  isSanta: boolean;
  /** Marked "I've got my gift": no more gift reminders. */
  hasGift: boolean;
  /** Added their postal address (posted editions): no address reminders. */
  hasAddress: boolean;
  /** The organizer, drawing by hand, with enough people in to draw. */
  canDraw: boolean;
  /** …and everyone they invited by email has joined. */
  everyoneIn: boolean;
}

export interface ReminderEdition {
  status: EditionStatus;
  drawnOn?: string;
  giftDay?: string;
  wishlistBy?: string;
  /** Gifts go by post (byPost or both). */
  posted: boolean;
  /** Posted exchanges only: gifts in the post by then. */
  postBy?: string;
}

export interface SentReminder {
  sentOn: string;
  /** The slots that email covered in this edition; [] for another edition of the group. */
  slots: string[];
}

export interface DueReminder {
  parts: ReminderPart[];
  /** Every slot this email covers: stored with it, so none is ever sent twice. */
  slots: string[];
}

/** At most one reminder email per person and group in this many days (gift day morning aside). */
export const REMINDER_GAP_DAYS = 7;
const PERIODIC_EVERY_DAYS = 14;
const PERIODIC_MAX = 3;
const LAST_TWO = [14, 7];
const ADDRESS_AFTER_JOINING_DAYS = 3;
const ADDRESS_BEFORE_DAYS = 14;

type Slot = { id: string; part: ReminderPart; on: string; until?: string };

const later = (a: string, b?: string) => (b && b > a ? b : a);

/** Every reminder this person could get in this edition, by date. */
const slotsOf = (person: ReminderPerson, edition: ReminderEdition, today: string): Slot[] => {
  const slots: Slot[] = [];
  const { status, giftDay } = edition;
  if ((status === 'open' || status === 'drawn') && person.wishCount === 0) {
    const deadline = edition.wishlistBy ?? giftDay;
    // Periodic ones only up to a week before the last two: those always fit the gap.
    const periodicUntil = deadline && addDays(deadline, -LAST_TWO[0] - REMINDER_GAP_DAYS);
    for (let i = 1; i <= PERIODIC_MAX; i++) {
      const on = addDays(person.joinedOn, i * PERIODIC_EVERY_DAYS);
      if (!periodicUntil || on <= periodicUntil) slots.push({ id: `wishlist-p${i}`, part: 'wishlist', on, until: deadline });
    }
    if (deadline) for (const days of LAST_TWO) slots.push({ id: `wishlist-${days}`, part: 'wishlist', on: addDays(deadline, -days), until: deadline });
  }
  const target = edition.postBy ?? giftDay;
  if ((status === 'open' || status === 'drawn') && edition.posted && !person.hasAddress) {
    slots.push({ id: 'address-joined', part: 'address', on: addDays(person.joinedOn, ADDRESS_AFTER_JOINING_DAYS), until: target });
    if (target) slots.push({ id: `address-${ADDRESS_BEFORE_DAYS}`, part: 'address', on: addDays(target, -ADDRESS_BEFORE_DAYS), until: target });
  }
  if (status === 'drawn' && person.isSanta && !person.hasGift && target) {
    const from = later(person.joinedOn, edition.drawnOn);
    for (const days of LAST_TWO) {
      const on = addDays(target, -days);
      if (on > from) slots.push({ id: `gift-${days}`, part: 'gift', on, until: target });
    }
  }
  if (status === 'open' && person.canDraw) {
    if (person.everyoneIn) slots.push({ id: 'ready', part: 'readyToDraw', on: today, until: giftDay });
    if (giftDay) slots.push({ id: 'ready-14', part: 'readyToDraw', on: addDays(giftDay, -14), until: giftDay });
  }
  // Nothing before they're in, nothing from the deadline (or gift day) on.
  return slots.filter((slot) => slot.on > person.joinedOn && (!slot.until || today < slot.until)).toSorted((a, b) => a.on.localeCompare(b.on));
};

/**
 * The reminder due today, or null. Per part (wishlist, address, gift, ready to draw) the latest slot of the
 * past week counts, once; an older one it replaces is never sent. When one part is due, a part due
 * within the coming week comes along in the same email. Never two emails within the gap.
 */
export const dueReminder = (person: ReminderPerson, edition: ReminderEdition, history: SentReminder[], today: string): DueReminder | null => {
  if (history.some((sent) => daysBetween(sent.sentOn, today) < REMINDER_GAP_DAYS)) return null;
  const sent = new Set(history.flatMap((h) => h.slots));
  const slots = slotsOf(person, edition, today);
  const byPart = parts.map((part) => {
    const own = slots.filter((slot) => slot.part === part);
    const recent = own.filter((slot) => slot.on <= today && daysBetween(slot.on, today) < REMINDER_GAP_DAYS);
    const latest = recent.at(-1);
    const soon = own.find((slot) => slot.on > today && daysBetween(today, slot.on) < REMINDER_GAP_DAYS);
    return {
      part,
      due: Boolean(latest && !sent.has(latest.id)),
      soon: Boolean(soon && !sent.has(soon.id)),
      covers: [...recent, ...(soon ? [soon] : [])].map((slot) => slot.id).filter((id) => !sent.has(id)),
    };
  });
  if (!byPart.some((p) => p.due)) return null;
  const included = byPart.filter((p) => p.due || p.soon);
  return { parts: included.map((p) => p.part), slots: included.flatMap((p) => p.covers) };
};
