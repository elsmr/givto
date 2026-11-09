import * as v from 'valibot';
import {
  EmailSafeText,
  Id,
  LocalDate,
  LocalTime,
  Locale,
  MultiLine,
  Price,
  SingleLine,
  TimeZone,
} from './common';
import { Member } from './member';

export const MIN_PARTICIPANTS = 3;
export const MAX_MEMBERS = 100;

export const groupStatuses = ['draft', 'open', 'drawn', 'giftday', 'done', 'archived'] as const;
/** draft (33: nothing sent yet) → open (joinable) → drawn → giftday → done → archived. */
export const GroupStatus = v.picklist(groupStatuses);
export type GroupStatus = v.InferOutput<typeof GroupStatus>;

export const Slug = v.pipe(v.string(), v.regex(/^[A-Za-z0-9_-]{6,32}$/, 'invalid_slug'));

export const GroupName = EmailSafeText(80);

export const ExchangeMode = v.picklist(['inPerson', 'byPost', 'both']);
export type ExchangeMode = v.InferOutput<typeof ExchangeMode>;

/** Local date + optional time in the group's time zone, not a UTC instant: all-day events must not shift a day (28). */
export const GiftDay = v.object({
  date: LocalDate,
  time: v.optional(LocalTime),
  place: v.optional(SingleLine(200)),
});
export type GiftDay = v.InferOutput<typeof GiftDay>;

/** Directed: member `from` must not give to member `to` (34). Same shape as `Exclusion` in lib/draw. */
export const Exclusion = v.object({ from: Id, to: Id });

/** Nobody gives to someone in their own household (26). */
export const Household = v.object({
  id: Id,
  name: v.optional(SingleLine(50)),
  memberIds: v.pipe(v.array(Id), v.minLength(2), v.maxLength(MAX_MEMBERS)),
});
export type Household = v.InferOutput<typeof Household>;

/** Shareable join link (45): multi-use, revocable (enabled) and regenerable (new token). */
export const JoinLink = v.object({
  token: v.pipe(v.string(), v.regex(/^[A-Za-z0-9_-]{16,64}$/, 'invalid_token')),
  enabled: v.boolean(),
  requiresApproval: v.boolean(),
  maxMembers: v.optional(v.pipe(v.number(), v.integer(), v.minValue(MIN_PARTICIPANTS), v.maxValue(MAX_MEMBERS))),
  expiresAt: v.optional(v.date()),
  createdAt: v.date(),
});
export type JoinLink = v.InferOutput<typeof JoinLink>;

/** Yearly editions of the same group (33). */
export const Series = v.object({
  id: Id,
  edition: v.pipe(v.number(), v.integer(), v.minValue(1)),
  previousGroupId: v.optional(Id),
  /** "Not the same as last year": one-way exclusions from the previous draw, never shown to anyone. */
  avoidPreviousGiftees: v.boolean(),
});
export type Series = v.InferOutput<typeof Series>;

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

/** Unwrap order (32): independent of the Santa chain. */
export const UnwrapOrder = v.object({
  memberIds: v.array(Id),
  shuffledAt: v.date(),
});

/** The big reveal (31): organizer toggle, off by default. */
export const Reveal = v.object({
  enabled: v.boolean(),
  revealedAt: v.optional(v.date()),
});

/** Fields the organizer edits. All dates are local dates in `timeZone`. */
export const GroupFields = v.object({
  name: GroupName,
  /** Email language for people without an account; defaults to the organizer's. */
  locale: Locale,
  timeZone: TimeZone,
  giftDay: v.optional(GiftDay),
  /** Scheduled draw; absent = the organizer draws manually. */
  drawOn: v.optional(LocalDate),
  wishlistBy: v.optional(LocalDate),
  exchangeMode: ExchangeMode,
  /** Posted exchanges: post by this date. */
  postBy: v.optional(LocalDate),
  budget: v.optional(Price),
  notes: v.optional(MultiLine(2000)),
});
export type GroupFields = v.InferOutput<typeof GroupFields>;

type GroupDates = Partial<Pick<GroupFields, 'giftDay' | 'drawOn' | 'wishlistBy' | 'postBy'>>;

/**
 * Pipe this onto group inputs that carry dates (28): draw before gift day, wishlists and
 * posting no later than gift day. ISO dates compare as strings. "Not in the past" needs
 * the current date in the group's time zone, so the procedure checks that.
 */
export const checkGroupDates = v.check<GroupDates, 'dates_out_of_order'>(
  ({ giftDay, drawOn, wishlistBy, postBy }) =>
    !giftDay ||
    ((!drawOn || drawOn < giftDay.date) &&
      (!wishlistBy || wishlistBy <= giftDay.date) &&
      (!postBy || postBy <= giftDay.date)),
  'dates_out_of_order'
);

/** `groups` collection. Members are embedded (small groups, atomic updates). */
export const Group = v.object({
  _id: Id,
  slug: Slug,
  ...GroupFields.entries,
  status: GroupStatus,
  /** When the group entered each status. */
  statusChangedAt: v.object({
    draft: v.optional(v.date()),
    open: v.optional(v.date()),
    drawn: v.optional(v.date()),
    giftday: v.optional(v.date()),
    done: v.optional(v.date()),
    archived: v.optional(v.date()),
  }),
  /** User id of the creator. */
  createdBy: Id,
  members: v.pipe(v.array(Member), v.maxLength(MAX_MEMBERS)),
  exclusions: v.array(Exclusion),
  households: v.array(Household),
  joinLink: v.optional(JoinLink),
  series: v.optional(Series),
  draw: v.optional(Draw),
  unwrapOrder: v.optional(UnwrapOrder),
  reveal: Reveal,
  createdAt: v.date(),
  updatedAt: v.date(),
  deletedAt: v.optional(v.date()),
});
export type Group = v.InferOutput<typeof Group>;
