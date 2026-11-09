// Pure: local dates (YYYY-MM-DD) in an edition's time zone, shared by the UI and the server (28).

/** Today's date in `timeZone`, e.g. "2026-12-01". */
export const todayIn = (timeZone: string, now = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

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

/** `date` (YYYY-MM-DD) plus `days`. */
export const addDays = (date: string, days: number): string =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
