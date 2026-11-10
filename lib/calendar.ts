// Pure (client and server): gift day and post-by as calendar events (47). The group home offers
// the .ics download and Google/Outlook links; emails (S7) attach `toIcs(editionCalendarEvents(…))`.
import { addDays, zonedInstant } from './local-date';
import type { GiftDay } from './schema/edition';
import type { ExchangeMode } from './schema/group';

/** All-day when `time` is absent (a local date never shifts a day); timed events last a few hours. */
export interface CalendarEvent {
  /** Stable per edition and event, so a re-import updates the event instead of adding one. */
  uid: string;
  sequence: number;
  title: string;
  date: string;
  time?: string;
  timeZone: string;
  location?: string;
  description?: string;
}

export interface CalendarEdition {
  groupSlug: string;
  editionNumber: number;
  timeZone: string;
  giftDay?: GiftDay;
  postBy?: string;
  exchangeMode: ExchangeMode;
  calendarSequence?: number;
}

/** Localized by the caller: titles like "Family: gift day", a description with the group link. */
export interface CalendarTexts {
  giftDay: string;
  postBy: string;
  description: string;
}

const TIMED_EVENT_HOURS = 3;

export const editionCalendarEvents = (edition: CalendarEdition, texts: CalendarTexts): CalendarEvent[] => {
  const base = { sequence: edition.calendarSequence ?? 0, timeZone: edition.timeZone, description: texts.description };
  const id = `${edition.groupSlug}-${edition.editionNumber}@givto.app`;
  const posted = edition.exchangeMode !== 'inPerson';
  return [
    ...(edition.giftDay
      ? [{ ...base, uid: `gift-day-${id}`, title: texts.giftDay, date: edition.giftDay.date, time: edition.giftDay.time, location: edition.giftDay.place }]
      : []),
    ...(posted && edition.postBy ? [{ ...base, uid: `post-by-${id}`, title: texts.postBy, date: edition.postBy }] : []),
  ];
};

const utcStamp = (instant: Date) => instant.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const compactDate = (date: string) => date.replace(/-/g, '');

/** Start and end as UTC instants for timed events. */
const timedRange = (event: CalendarEvent & { time: string }) => {
  const start = zonedInstant(event.date, event.time, event.timeZone);
  return [start, new Date(start.getTime() + TIMED_EVENT_HOURS * 3_600_000)] as const;
};

const escapeText = (text: string) =>
  text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

// RFC 5545: lines of at most 75 octets, continued with CRLF + space.
const fold = (line: string): string => {
  const encoder = new TextEncoder();
  const chunks: string[] = [];
  let current = '';
  for (const char of line) {
    if (encoder.encode(current + char).length > (chunks.length ? 74 : 75)) {
      chunks.push(current);
      current = '';
    }
    current += char;
  }
  return [...chunks, current].join('\r\n ');
};

const eventLines = (event: CalendarEvent, now: Date): string[] => {
  const when = event.time
    ? timedRange({ ...event, time: event.time }).map((instant, i) => `${i ? 'DTEND' : 'DTSTART'}:${utcStamp(instant)}`)
    : [`DTSTART;VALUE=DATE:${compactDate(event.date)}`, `DTEND;VALUE=DATE:${compactDate(addDays(event.date, 1))}`];
  return [
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `SEQUENCE:${event.sequence}`,
    `DTSTAMP:${utcStamp(now)}`,
    ...when,
    `SUMMARY:${escapeText(event.title)}`,
    ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
    ...(event.description ? [`DESCRIPTION:${escapeText(event.description)}`] : []),
    'END:VEVENT',
  ];
};

/** An iCalendar file (text/calendar) with the events. */
export const toIcs = (events: CalendarEvent[], now = new Date()): string =>
  [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Givto//Secret Santa//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events.flatMap((event) => eventLines(event, now)),
    'END:VCALENDAR',
  ]
    .map(fold)
    .join('\r\n') + '\r\n';

export const googleCalendarUrl = (event: CalendarEvent): string => {
  const dates = event.time
    ? timedRange({ ...event, time: event.time }).map(utcStamp).join('/')
    : `${compactDate(event.date)}/${compactDate(addDays(event.date, 1))}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates,
    ctz: event.timeZone,
    ...(event.description && { details: event.description }),
    ...(event.location && { location: event.location }),
  });
  return `https://calendar.google.com/calendar/render?${params}`;
};

export const outlookCalendarUrl = (event: CalendarEvent): string => {
  const [startdt, enddt] = event.time
    ? timedRange({ ...event, time: event.time }).map((instant) => instant.toISOString())
    : [event.date, addDays(event.date, 1)];
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    startdt,
    enddt,
    ...(!event.time && { allday: 'true' }),
    ...(event.description && { body: event.description }),
    ...(event.location && { location: event.location }),
  });
  return `https://outlook.live.com/calendar/0/action/compose?${params}`;
};
