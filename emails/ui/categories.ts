import type { NotificationPrefs } from '../../lib/schema/user';

/** Email categories with an unsubscribe link; each is one of the account's notification settings. */
export const unsubscribeCategories = ['reminders', 'wishlistUpdates', 'santaMessages', 'joins'] as const satisfies (keyof NotificationPrefs)[];
export type UnsubscribeCategory = (typeof unsubscribeCategories)[number];
