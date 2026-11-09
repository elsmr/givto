// When anonymous messages (Psst!, Santa questions) reach the giftee (30, 52): at a fixed
// time of day in the edition's time zone, so the moment of delivery doesn't point at the
// Santa sitting across the room. Pure, so the scheduled jobs can reuse it.

/** Local hour (0-23) at which anonymous messages are delivered. */
export const ANONYMOUS_SEND_HOUR = 18;
/** Never deliver sooner than this after the Santa acted. */
export const ANONYMOUS_MIN_DELAY_MS = 60 * 60 * 1000;

const localParts = (instant: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  return { year: part('year'), month: part('month'), day: part('day'), hour: part('hour'), minute: part('minute'), second: part('second') };
};

/** Milliseconds the zone is ahead of UTC at `instant`. */
const offsetAt = (instant: number, timeZone: string) => {
  const p = localParts(new Date(instant), timeZone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(instant / 1000) * 1000;
};

/** The instant of `hour`:00 local time on a local date (day may overflow into the next month). */
const atLocalHour = (year: number, month: number, day: number, hour: number, timeZone: string) => {
  const wallClock = Date.UTC(year, month - 1, day, hour);
  const firstGuess = wallClock - offsetAt(wallClock, timeZone);
  return new Date(wallClock - offsetAt(firstGuess, timeZone));
};

/** The first ANONYMOUS_SEND_HOUR:00 in `timeZone` that is at least ANONYMOUS_MIN_DELAY_MS after `now`. */
export const anonymousSendAt = (now: Date, timeZone: string): Date => {
  const earliest = now.getTime() + ANONYMOUS_MIN_DELAY_MS;
  const today = localParts(now, timeZone);
  for (let day = 0; ; day++) {
    const at = atLocalHour(today.year, today.month, today.day + day, ANONYMOUS_SEND_HOUR, timeZone);
    if (at.getTime() >= earliest) return at;
  }
};
