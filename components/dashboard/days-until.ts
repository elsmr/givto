import { daysBetween, todayIn } from '@/lib/local-date';

/** Whole days from today in `timeZone` to a local date (YYYY-MM-DD); 0 on the day, negative after. */
export const daysUntil = (date: string, timeZone: string, now = new Date()): number => daysBetween(todayIn(timeZone, now), date);
