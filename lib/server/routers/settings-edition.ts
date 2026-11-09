import * as v from 'valibot';
import { findStuckGivers } from '../../draw';
import { todayIn, zonedInstant } from '../../local-date';
import { LocalDate, MultiLine, Price } from '../../schema/common';
import { checkEditionDates, EditionTitle, GiftDay, type Edition } from '../../schema/edition';
import { ExchangeMode, MIN_PARTICIPANTS } from '../../schema/group';
import { allRules, drawParticipantIds, drawRules } from '../draw/rules';
import { AppError } from '../errors';
import { organizerEditionProcedure } from './draw';
import { compactGiftDay, compactPrice } from './group';

/** Scheduled draws run at this local time on the draw date. */
const DRAW_TIME = '09:00';

export const EditionSettingsInput = v.pipe(
  v.object({
    title: EditionTitle,
    giftDay: v.optional(GiftDay),
    /** Local date of the scheduled draw; absent = the organizer draws by hand. */
    drawOn: v.optional(LocalDate),
    wishlistBy: v.optional(LocalDate),
    postBy: v.optional(LocalDate),
    exchangeMode: ExchangeMode,
    budget: v.optional(Price),
    notes: v.optional(MultiLine(2000)),
    avoidPreviousGiftees: v.boolean(),
  }),
  v.check((input) => checkEditionDates.requirement(input), checkEditionDates.message)
);

const optionalFields = ['giftDay', 'drawAt', 'wishlistBy', 'postBy', 'budget', 'notes'] as const;

/**
 * Dates (28): a changed date can't be in the past, the draw is before gift day, wishlists and
 * posting no later than gift day (schema). The schedule and "not the same as last year" are
 * fixed once drawn; turning the latter on must leave a possible draw. Done editions are read-only.
 */
export const updateEdition = organizerEditionProcedure.input(EditionSettingsInput).mutation(async ({ ctx, input }) => {
  const { edition } = ctx;
  if (edition.status === 'done') throw new AppError('EDITION_CLOSED');
  const today = todayIn(edition.timeZone);
  const drawOn = edition.drawAt && todayIn(edition.timeZone, edition.drawAt);
  const movedIntoPast = (next: string | undefined, current: string | undefined) =>
    next !== undefined && next !== current && next < today;
  if (
    movedIntoPast(input.giftDay?.date, edition.giftDay?.date) ||
    movedIntoPast(input.wishlistBy, edition.wishlistBy) ||
    movedIntoPast(input.postBy, edition.postBy) ||
    movedIntoPast(input.drawOn, drawOn)
  ) {
    throw new AppError('DATE_IN_PAST');
  }
  if (input.drawOn && input.giftDay && input.drawOn >= input.giftDay.date) throw new AppError('DATES_OUT_OF_ORDER');
  const beforeDraw = edition.status === 'draft' || edition.status === 'open';
  if (!beforeDraw && (input.drawOn !== drawOn || input.avoidPreviousGiftees !== edition.avoidPreviousGiftees)) {
    throw new AppError('ALREADY_DRAWN');
  }
  if (beforeDraw && input.avoidPreviousGiftees && !edition.avoidPreviousGiftees) {
    const ids = drawParticipantIds(ctx.group, edition);
    const rules = await drawRules(ctx.db, ctx.group, { ...edition, avoidPreviousGiftees: true });
    if (ids.length >= MIN_PARTICIPANTS && !findStuckGivers(ids, rules.standing) && findStuckGivers(ids, allRules(rules))) {
      throw new AppError('DRAW_IMPOSSIBLE', { details: { avoidPreviousGiftees: true } });
    }
  }

  const next = {
    title: input.title,
    exchangeMode: input.exchangeMode,
    avoidPreviousGiftees: input.avoidPreviousGiftees,
    giftDay: input.giftDay && compactGiftDay(input.giftDay),
    drawAt: input.drawOn ? zonedInstant(input.drawOn, DRAW_TIME, edition.timeZone) : undefined,
    wishlistBy: input.wishlistBy,
    postBy: input.postBy,
    budget: input.budget && compactPrice(input.budget),
    notes: input.notes,
  } satisfies Partial<Edition>;
  const calendarKey = (e: Pick<Edition, 'title' | 'giftDay' | 'postBy' | 'exchangeMode'>) =>
    JSON.stringify([e.title, e.giftDay?.date, e.giftDay?.time, e.giftDay?.place, e.postBy, e.exchangeMode]);
  const calendarChanged = calendarKey(next) !== calendarKey(edition);
  // The driver stores `undefined` as null, which the schemas reject: unset absent fields instead.
  const set: Partial<Edition> = Object.fromEntries(Object.entries(next).filter(([, value]) => value !== undefined));
  const unset: Partial<Record<keyof Edition, true>> = Object.fromEntries(
    optionalFields.filter((key) => next[key] === undefined).map((key) => [key, true])
  );
  const saved = await ctx.db.editions.updateOne(
    { _id: edition._id, status: edition.status },
    {
      $set: {
        ...set,
        ...(calendarChanged && { calendarSequence: (edition.calendarSequence ?? 0) + 1 }),
        updatedAt: new Date(),
      },
      ...(Object.keys(unset).length > 0 && { $unset: unset }),
    }
  );
  if (saved.matchedCount === 0) throw new AppError('EDITION_CHANGED');
  return { ok: true };
});
