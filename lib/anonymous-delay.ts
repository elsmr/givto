// When anonymous messages (Psst!, Santa questions) reach the giftee (30, 52): at a fixed
// time of day in the edition's time zone, so the moment of delivery doesn't point at the
// Santa sitting across the room. Pure, so the scheduled jobs can reuse it.
import { addDays, todayIn, zonedInstant } from './local-date';

/** Local time (HH:MM) at which anonymous messages are delivered. */
const ANONYMOUS_SEND_TIME = '18:00';
/** Never deliver sooner than this after the Santa acted. */
const ANONYMOUS_MIN_DELAY_MS = 60 * 60 * 1000;

/** The first ANONYMOUS_SEND_TIME in `timeZone` that is at least ANONYMOUS_MIN_DELAY_MS after `now`. */
export const anonymousSendAt = (now: Date, timeZone: string): Date => {
  const earliest = now.getTime() + ANONYMOUS_MIN_DELAY_MS;
  const today = todayIn(timeZone, now);
  for (let day = 0; ; day++) {
    const at = zonedInstant(addDays(today, day), ANONYMOUS_SEND_TIME, timeZone);
    if (at.getTime() >= earliest) return at;
  }
};
