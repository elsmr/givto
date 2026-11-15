// Pure: local dates (YYYY-MM-DD) in a group's time zone, shared by the UI and the server (28).

/** Today's date in `timeZone`, e.g. "2026-12-01". */
export const todayIn = (timeZone: string, now = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

/** The hour (0–23) at `now` in `timeZone`. */
export const hourIn = (timeZone: string, now = new Date()): number =>
  Number(new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' }).format(now));

/** Whole days from `from` to `to` (both YYYY-MM-DD); negative when `to` is earlier. */
export const daysBetween = (from: string, to: string): number =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/** Offset of `timeZone` from UTC at `instant`, in ms (positive east of UTC). */
const offsetAt = (instant: number, timeZone: string): number => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(instant));
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  const wall = Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'), part('second'));
  return wall - Math.floor(instant / 1000) * 1000;
};

/** The instant a wall-clock `date` + `time` (HH:MM) happens in `timeZone`, e.g. a scheduled draw (28). */
export const zonedInstant = (date: string, time: string, timeZone: string): Date => {
  const wall = Date.parse(`${date}T${time}:00Z`);
  // Twice: the first guess may sit on the other side of a DST change.
  const guess = wall - offsetAt(wall, timeZone);
  return new Date(wall - offsetAt(guess, timeZone));
};

/** A local date (YYYY-MM-DD) for people, e.g. "Friday 18 December 2026". Formatted in UTC so it never shifts a day. */
export const formatLocalDate = (date: string, locale: string, options: Intl.DateTimeFormatOptions = { dateStyle: 'full' }): string =>
  new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));

/** `date` (YYYY-MM-DD) plus `days`. */
export const addDays = (date: string, days: number): string =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

export type CountdownUnit = 'day' | 'week' | 'month' | 'year';

/** `days` in the unit people would say: days under two weeks, weeks under two months, then months and years. Keeps the sign. */
export const countdown = (days: number): { value: number; unit: CountdownUnit } => {
  const abs = Math.abs(days);
  const [value, unit]: [number, CountdownUnit] =
    abs < 14 ? [abs, 'day'] : abs < 60 ? [Math.round(abs / 7), 'week'] : abs < 365 ? [Math.round(abs / 30.44), 'month'] : [Math.round(abs / 365), 'year'];
  return { value: days < 0 ? -value : value, unit };
};

export type TimedCountdownUnit = CountdownUnit | 'hour' | 'second';

/**
 * Time to gift day as `countdown` says it in days; with a `time`, hours in its last day and every second in its
 * last hour. Once the time has passed on the day itself, 0 days.
 */
export const countdownTo = (date: string, time: string | undefined, timeZone: string, now = new Date()): { value: number; unit: TimedCountdownUnit } => {
  const ms = time ? zonedInstant(date, time, timeZone).getTime() - now.getTime() : 0;
  if (ms > 0 && ms < 3_600_000) return { value: Math.ceil(ms / 1000), unit: 'second' };
  if (ms > 0 && ms < 86_400_000) return { value: Math.floor(ms / 3_600_000), unit: 'hour' };
  return countdown(daysBetween(todayIn(timeZone, now), date));
};

/** Seconds as a clock, e.g. 3599 → "59:59". */
export const clock = (seconds: number): string => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

export type Holiday = 'christmasEve' | 'christmasDay' | 'newYearsEve' | 'newYearsDay' | 'thanksgiving';

const fixedHolidays: Record<string, Holiday> = { '12-24': 'christmasEve', '12-25': 'christmasDay', '12-31': 'newYearsEve', '01-01': 'newYearsDay' };

/** The popular gift day a local date (YYYY-MM-DD) falls on. Thanksgiving: the US one (4th Thursday of November) or Canada's (2nd Monday of October). */
export const holidayOn = (date: string): Holiday | undefined => {
  const month = Number(date.slice(5, 7));
  const week = Math.ceil(Number(date.slice(8, 10)) / 7);
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  if ((month === 11 && week === 4 && weekday === 4) || (month === 10 && week === 2 && weekday === 1)) return 'thanksgiving';
  return fixedHolidays[date.slice(5)];
};
