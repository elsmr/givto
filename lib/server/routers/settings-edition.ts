import * as v from 'valibot';
import { findStuckGivers } from '../../draw';
import { todayIn, zonedInstant } from '../../local-date';
import { LocalDate, MultiLine, Price } from '../../schema/common';
import { checkEditionDates, EditionTitle, GiftDay, isBeforeDraw, type Edition } from '../../schema/edition';
import { ExchangeMode, MIN_PARTICIPANTS } from '../../schema/group';
import { allRules, drawParticipantIds, drawRules } from '../draw/rules';
import { AppError } from '../errors';
import { organizerEditionProcedure } from '../trpc';
import { compactGiftDay, compactPrice } from './group';

/** Scheduled draws run at this local time on the draw date. */
export const DRAW_TIME = '09:00';

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
  }),
  v.check((input) => checkEditionDates.requirement(input), checkEditionDates.message)
);

const optionalFields = ['giftDay', 'drawAt', 'wishlistBy', 'postBy', 'budget', 'notes'] as const;

/**
 * Dates (28): a changed date can't be in the past, the draw is before gift day, wishlists and
 * posting no later than gift day (schema). The schedule is fixed once drawn. Done editions are read-only.
 */
export const updateEdition = organizerEditionProcedure.input(EditionSettingsInput).mutation(async ({ ctx, input }) => {
  const { edition } = ctx;
  const { timeZone } = ctx.group;
  if (edition.status === 'done') throw new AppError('EDITION_CLOSED');
  const today = todayIn(timeZone);
  const drawOn = edition.drawAt && todayIn(timeZone, edition.drawAt);
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
  if (!isBeforeDraw(edition) && input.drawOn !== drawOn) throw new AppError('ALREADY_DRAWN');

  const next = {
    title: input.title,
    exchangeMode: input.exchangeMode,
    giftDay: input.giftDay && compactGiftDay(input.giftDay, input.exchangeMode),
    drawAt: input.drawOn ? zonedInstant(input.drawOn, DRAW_TIME, timeZone) : undefined,
    wishlistBy: input.wishlistBy,
    postBy: input.postBy,
    budget: input.budget && compactPrice(input.budget),
    notes: input.notes,
  } satisfies Partial<Edition>;
  const calendarKey = (e: Pick<Edition, 'title' | 'giftDay' | 'postBy' | 'exchangeMode'>) =>
    JSON.stringify([e.title, e.giftDay?.date, e.giftDay?.time, e.giftDay?.place, e.giftDay?.callUrl, e.postBy, e.exchangeMode]);
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

/** "Not the same as last time": before the draw only; turning it on must leave a possible draw. */
export const setAvoidPrevious = organizerEditionProcedure.input(v.object({ enabled: v.boolean() })).mutation(async ({ ctx, input }) => {
  const { edition } = ctx;
  if (!isBeforeDraw(edition)) throw new AppError('ALREADY_DRAWN');
  if (input.enabled && !edition.avoidPreviousGiftees) {
    const ids = drawParticipantIds(ctx.group, edition);
    const rules = await drawRules(ctx.db, ctx.group, { ...edition, avoidPreviousGiftees: true });
    if (ids.length >= MIN_PARTICIPANTS && !findStuckGivers(ids, rules.standing) && findStuckGivers(ids, allRules(rules))) {
      throw new AppError('DRAW_IMPOSSIBLE', { details: { avoidPreviousGiftees: true } });
    }
  }
  const saved = await ctx.db.editions.updateOne(
    { _id: edition._id, status: edition.status },
    { $set: { avoidPreviousGiftees: input.enabled, updatedAt: new Date() } }
  );
  if (saved.matchedCount === 0) throw new AppError('EDITION_CHANGED');
  return { ok: true };
});
