import * as v from 'valibot';
import { Id, LocalDate, LocalTime, MultiLine, Price, SingleLine, TimeZone } from './common';
import { ExchangeMode } from './group';

export const editionStatuses = ['draft', 'open', 'drawn', 'giftday', 'done'] as const;
/** draft (33: nothing sent yet) → open (joinable) → drawn → giftday → done. */
export const EditionStatus = v.picklist(editionStatuses);
export type EditionStatus = v.InferOutput<typeof EditionStatus>;

/** People can still join, and the participants and keep-apart rules can change. */
export const isBeforeDraw = ({ status }: { status: EditionStatus }) => status === 'draft' || status === 'open';
/** From the draw until gift day is over: `edition.draw` is the live result. */
export const isDrawn = ({ status }: { status: EditionStatus }) => status === 'drawn' || status === 'giftday';
/** Gift day has started (by date or by hand), also once it's over. */
export const isFromGiftDay = ({ status }: { status: EditionStatus }) => status === 'giftday' || status === 'done';

/** e.g. "Secret Santa 2026". */
export const EditionTitle = SingleLine(80);

/** "Secret Santa 2026", or "Secret Santa 2026 (2)", "(3)" … when the group has that title already (77). */
export const defaultEditionTitle = (year: number, takenTitles: string[]): string => {
  const numbered = (n: number) => (n === 1 ? `Secret Santa ${year}` : `Secret Santa ${year} (${n})`);
  return Array.from({ length: takenTitles.length + 1 }, (_, i) => numbered(i + 1)).find((title) => !takenTitles.includes(title))!;
};

/** Local date + optional time in the edition's time zone, not a UTC instant: all-day events must not shift a day (28). */
export const GiftDay = v.object({
  date: LocalDate,
  time: v.optional(LocalTime),
  place: v.optional(SingleLine(200)),
});
export type GiftDay = v.InferOutput<typeof GiftDay>;

/** For posted exchanges (28): visible to this participant's Santa only, after the draw; deleted after the event. */
export const PostalAddress = v.object({
  recipient: v.optional(SingleLine(100)),
  lines: v.pipe(v.array(SingleLine(100)), v.minLength(1), v.maxLength(3)),
  postalCode: SingleLine(20),
  city: SingleLine(100),
  region: v.optional(SingleLine(100)),
  /** ISO 3166-1 alpha-2, e.g. NL. */
  country: v.pipe(v.string(), v.regex(/^[A-Z]{2}$/, 'invalid_country')),
});
export type PostalAddress = v.InferOutput<typeof PostalAddress>;

/** invited: ticked for this edition, not confirmed yet. joined: in. declined: sits this one out. */
export const ParticipantStatus = v.picklist(['invited', 'joined', 'declined']);
export type ParticipantStatus = v.InferOutput<typeof ParticipantStatus>;

/**
 * A group member ticked for this edition. Keyed by member id (managed members have no
 * user id; the member links the account). Next year's edition starts with every current
 * member ticked; the organizer unticks (`participates: false`) or adds before opening.
 */
export const Participant = v.object({
  memberId: Id,
  /** In the draw. The organizer may sit out. */
  participates: v.boolean(),
  status: ParticipantStatus,
  addedAt: v.date(),
  address: v.optional(PostalAddress),
  /** Last time this participant, as a Santa, viewed their giftee's wishlist (35: skip stale notifications). */
  gifteeWishlistSeenAt: v.optional(v.date()),
  /** Set when this Santa's giftee changed after the draw (late joiner, someone left, re-draw); cleared once they've seen it. */
  gifteeChangedAt: v.optional(v.date()),
});
export type Participant = v.InferOutput<typeof Participant>;

/** Santa member id → giftee member id. */
export const Assignments = v.record(Id, Id);
export type Assignments = v.InferOutput<typeof Assignments>;

export const Draw = v.object({
  assignments: Assignments,
  drawnAt: v.date(),
  /** Earlier draws replaced by a re-draw (27). Server-only, like `assignments`. */
  history: v.array(v.object({ assignments: Assignments, drawnAt: v.date(), replacedAt: v.date() })),
});
export type Draw = v.InferOutput<typeof Draw>;

/** allAtOnce: each person opens all their gifts in their turn. oneByOne: one gift per turn, round and round until nobody has any left. */
export const UnwrapMode = v.picklist(['allAtOnce', 'oneByOne']);
export type UnwrapMode = v.InferOutput<typeof UnwrapMode>;

/** One turn taken in the presenter view. `last`: that was their last gift (always true in allAtOnce). */
export const UnwrapTurn = v.object({ memberId: Id, last: v.boolean() });
export type UnwrapTurn = v.InferOutput<typeof UnwrapTurn>;

/**
 * Unwrap order (32): independent of the Santa chain. `progress`: the presenter's turns so far,
 * stored so a refresh or another device carries on and the group home shows who's unwrapping.
 * Who's up, the round and who's done follow from the order and the turns (lib/unwrap-turns.ts).
 */
export const UnwrapOrder = v.object({
  memberIds: v.array(Id),
  shuffledAt: v.date(),
  progress: v.optional(
    v.object({
      startedAt: v.date(),
      turns: v.array(UnwrapTurn),
      /** The presenter's "Who's next?" reel has landed on the current person (until then members don't see who). */
      currentShown: v.boolean(),
      /** Guess your Santa (62): people whose Santa (and guess) the presenter showed at their turn, in that order. */
      santaShownIds: v.optional(v.array(Id)),
    })
  ),
});

/** The big reveal (31): organizer toggle, off by default. */
export const Reveal = v.object({
  enabled: v.boolean(),
  revealedAt: v.optional(v.date()),
});

/** Fields the organizer edits. All dates are local dates in `timeZone`. */
export const EditionFields = v.object({
  title: EditionTitle,
  timeZone: TimeZone,
  giftDay: v.optional(GiftDay),
  /** Scheduled draw (an instant, for the scheduler); absent = the organizer draws manually. */
  drawAt: v.optional(v.date()),
  wishlistBy: v.optional(LocalDate),
  exchangeMode: ExchangeMode,
  /** Posted exchanges: post by this date. */
  postBy: v.optional(LocalDate),
  budget: v.optional(Price),
  notes: v.optional(MultiLine(2000)),
  /** "Not the same as last year" (33): one-way exclusions derived server-side from the previous edition's draw, never exposed. */
  avoidPreviousGiftees: v.optional(v.boolean(), false),
});
export type EditionFields = v.InferOutput<typeof EditionFields>;

type EditionDates = Partial<Pick<EditionFields, 'giftDay' | 'wishlistBy' | 'postBy'>>;

/**
 * Pipe this onto edition inputs that carry dates (28): wishlists and posting no later than
 * gift day (ISO dates compare as strings). "Draw before gift day" and "not in the past"
 * need the edition's time zone, so the procedure checks those.
 */
export const checkEditionDates = v.check<EditionDates, 'dates_out_of_order'>(
  ({ giftDay, wishlistBy, postBy }) =>
    !giftDay ||
    ((!wishlistBy || wishlistBy <= giftDay.date) && (!postBy || postBy <= giftDay.date)),
  'dates_out_of_order'
);

/**
 * `editions` collection: one Secret Santa of a group. Claims, tips, questions, nudges and
 * notification logs reference `editionId`.
 */
export const Edition = v.object({
  _id: Id,
  groupId: Id,
  /** 1, 2, 3 … per group; the `[edition]` URL segment (`/g/[slug]/[edition]`). Unique where a year might not be. */
  number: v.pipe(v.number(), v.integer(), v.minValue(1)),
  /** The edition's label year, e.g. 2026 in "Secret Santa 2026". */
  year: v.pipe(v.number(), v.integer(), v.minValue(2000), v.maxValue(2100)),
  ...EditionFields.entries,
  status: EditionStatus,
  /** When the edition entered each status. */
  statusChangedAt: v.object({
    draft: v.optional(v.date()),
    open: v.optional(v.date()),
    drawn: v.optional(v.date()),
    giftday: v.optional(v.date()),
    done: v.optional(v.date()),
  }),
  participants: v.array(Participant),
  previousEditionId: v.optional(Id),
  draw: v.optional(Draw),
  /** Set when the draw changes, unset once its notices are out: the deliveries job only retries these. */
  drawNoticesPendingAt: v.optional(v.date()),
  unwrapOrder: v.optional(UnwrapOrder),
  /** Organizer setting; absent = allAtOnce. */
  unwrapMode: v.optional(UnwrapMode),
  reveal: Reveal,
  /** Guess your Santa (62): organizer setting, absent = on. Off hides all guessing (the guesses stay stored). */
  guessing: v.optional(v.boolean()),
  /** iCalendar SEQUENCE (47), absent = 0: bumped when the calendar events change, so re-imports update instead of duplicating. */
  calendarSequence: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  createdAt: v.date(),
  updatedAt: v.date(),
});
export type Edition = v.InferOutput<typeof Edition>;
