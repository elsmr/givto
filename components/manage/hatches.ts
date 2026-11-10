import type { EditionStatus } from '@/lib/schema/edition';

/** The organizer's escape hatches (64), each a `manage.<hatch>` procedure. */
export type Hatch = 'startGiftDay' | 'finishGiftDay' | 'backToShopping' | 'reopenGiftDay';

/** What the Manage menu offers per status (the group's latest edition only). */
export const hatchesFor = (status: EditionStatus): Hatch[] => {
  if (status === 'drawn') return ['startGiftDay'];
  if (status === 'giftday') return ['finishGiftDay', 'backToShopping'];
  if (status === 'done') return ['reopenGiftDay'];
  return [];
};

/** What happens, as the confirm dialog lists it (keys in the `manage` messages). */
export const hatchPoints = {
  startGiftDay: ['startGiftDay.points.date', 'startGiftDay.points.order', 'startGiftDay.points.open', 'startGiftDay.points.secret'],
  finishGiftDay: ['finishGiftDay.points.closed', 'finishGiftDay.points.received', 'finishGiftDay.points.next', 'finishGiftDay.points.undo'],
  backToShopping: ['backToShopping.points.date', 'backToShopping.points.order', 'backToShopping.points.secret'],
  reopenGiftDay: ['reopenGiftDay.points.open', 'reopenGiftDay.points.date', 'reopenGiftDay.points.secret'],
} as const satisfies Record<Hatch, readonly string[]>;

export const hatchErrors = [
  'NOT_DRAWN',
  'NOT_GIFT_DAY',
  'GIFT_DAY_UNDERWAY',
  'DATE_IN_PAST',
  'EDITION_CLOSED',
  'EDITION_CHANGED',
] as const;
