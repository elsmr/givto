import * as v from 'valibot';
import { findStuckGivers } from '../../draw';
import { toExclusions } from '../../exclusions';
import { todayIn } from '../../local-date';
import { Id, PersonName, Price, TimeZone } from '../../schema/common';
import { GiftDay, type Edition } from '../../schema/edition';
import { ExchangeMode, GroupName, MAX_MEMBERS, MIN_PARTICIPANTS, type Group } from '../../schema/group';
import type { Member } from '../../schema/member';
import { newId } from '../db';
import { AppError } from '../errors';
import { currentEdition, nameUserIfUnnamed, randomToken } from '../membership';
import { enforceRateLimit } from '../rate-limit';
import { authedProcedure, memberProcedure, organizerProcedure, router } from '../trpc';
import { groupView } from './group-view';

const GROUPS_PER_USER_PER_DAY = { window: 24 * 60 * 60, max: 10 };

export const CreateGroupInput = v.object({
  name: GroupName,
  organizerName: PersonName,
  timeZone: TimeZone,
  giftDay: v.optional(GiftDay),
  exchangeMode: ExchangeMode,
  budget: v.optional(Price),
});

const KeepApartInput = v.object({
  households: v.pipe(v.array(v.pipe(v.array(Id), v.minLength(2))), v.maxLength(MAX_MEMBERS)),
  pairs: v.pipe(v.array(v.tuple([Id, Id])), v.maxLength(MAX_MEMBERS * MAX_MEMBERS)),
});

const compactGiftDay = ({ date, time, place }: GiftDay): GiftDay => ({
  date,
  ...(time && { time }),
  ...(place && { place }),
});

const compactPrice = ({ currency, amount, maxAmount }: Price): Price => ({
  currency,
  amount,
  ...(maxAmount !== undefined && { maxAmount }),
});

const isDrawn = (edition: Edition | null) => edition?.status === 'drawn' || edition?.status === 'giftday';

export const groupRouter = router({
  /** Group + first edition (open), organizer joined. Needs a verified session (no open relay, 43). */
  create: authedProcedure.input(CreateGroupInput).mutation(async ({ ctx, input }) => {
    await enforceRateLimit(`group:create:${ctx.user.id}`, GROUPS_PER_USER_PER_DAY);
    const today = todayIn(input.timeZone);
    if (input.giftDay && input.giftDay.date < today) throw new AppError('DATE_IN_PAST');

    const now = new Date();
    // The driver stores `undefined` as null, which the schemas reject: leave absent fields out.
    const optional = input.budget ? { budget: compactPrice(input.budget) } : {};
    const organizer: Member = {
      id: newId(),
      userId: ctx.user.id,
      name: input.organizerName,
      role: 'organizer',
      status: 'joined',
      joinedAt: now,
      wishlistView: { includeNewWishes: true, hiddenWishIds: [] },
    };
    const group: Group = {
      _id: newId(),
      slug: randomToken(9),
      name: input.name,
      locale: ctx.user.locale === 'nl' ? 'nl' : 'en',
      defaults: { timeZone: input.timeZone, exchangeMode: input.exchangeMode, ...optional },
      createdBy: ctx.user.id,
      members: [organizer],
      exclusions: [],
      households: [],
      joinLink: { token: randomToken(), revoked: false, requiresApproval: false, createdAt: now },
      createdAt: now,
      updatedAt: now,
    };
    const year = Number((input.giftDay?.date ?? today).slice(0, 4));
    const edition: Edition = {
      _id: newId(),
      groupId: group._id,
      number: 1,
      year,
      title: `Secret Santa ${year}`,
      timeZone: input.timeZone,
      exchangeMode: input.exchangeMode,
      ...optional,
      ...(input.giftDay && { giftDay: compactGiftDay(input.giftDay) }),
      avoidPreviousGiftees: false,
      status: 'open',
      statusChangedAt: { open: now },
      participants: [{ memberId: organizer.id, participates: true, status: 'joined', addedAt: now }],
      reveal: { enabled: false },
      createdAt: now,
      updatedAt: now,
    };
    await ctx.db.groups.insertOne(group);
    await ctx.db.editions.insertOne(edition);
    await nameUserIfUnnamed(ctx.db, ctx.user.id, input.organizerName);
    return { slug: group.slug, joinToken: group.joinLink!.token };
  }),

  /** Group home: current edition, people (emails for the organizer only), organizer tools. */
  get: memberProcedure.query(async ({ ctx }) =>
    groupView(ctx.db, ctx.group, ctx.member, await currentEdition(ctx.db, ctx.group._id))
  ),

  /** Households + keep-apart pairs (26). Before the draw; refuses sets that make the draw impossible. */
  setKeepApart: organizerProcedure.input(KeepApartInput).mutation(async ({ ctx, input }) => {
    const edition = await currentEdition(ctx.db, ctx.group._id);
    if (isDrawn(edition)) throw new AppError('ALREADY_DRAWN');
    const joined = new Set(ctx.group.members.filter((m) => m.status === 'joined').map((m) => m.id));
    const ids = [...input.households.flat(), ...input.pairs.flat()];
    const inOneHousehold = new Set(input.households.flat()).size === input.households.flat().length;
    const distinctPairs = input.pairs.every(([a, b]) => a !== b);
    if (!ids.every((id) => joined.has(id)) || !inOneHousehold || !distinctPairs) {
      throw new AppError('INVALID_INPUT');
    }
    const exclusions = toExclusions(input.households, input.pairs);
    const participants = (edition?.participants ?? [])
      .filter((p) => p.participates && p.status === 'joined')
      .map((p) => p.memberId);
    const stuck = participants.length >= MIN_PARTICIPANTS ? findStuckGivers(participants, exclusions) : null;
    if (stuck) throw new AppError('DRAW_IMPOSSIBLE', { details: { memberIds: stuck.givers } });
    await ctx.db.groups.updateOne(
      { _id: ctx.group._id },
      {
        $set: {
          households: input.households.map((memberIds) => ({ id: newId(), memberIds })),
          exclusions: toExclusions([], input.pairs),
          updatedAt: new Date(),
        },
      }
    );
    return { ok: true };
  }),
});
