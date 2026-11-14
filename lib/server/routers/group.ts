import * as v from 'valibot';
import { findStuckGivers } from '../../draw';
import { toExclusions } from '../../exclusions';
import { todayIn } from '../../local-date';
import { Id, PersonName, Price, TimeZone } from '../../schema/common';
import { defaultEditionTitle, drawsNames, EditionKind, GiftDay, isDrawn, type Edition } from '../../schema/edition';
import { ExchangeMode, GroupName, MAX_MEMBERS, MIN_PARTICIPANTS, type Group } from '../../schema/group';
import type { Member } from '../../schema/member';
import { newId } from '../db';
import { drawParticipantIds } from '../draw/rules';
import { compactGiftDay, compactPrice } from '../edition/fields';
import { AppError } from '../errors';
import { groupView } from '../group/group-view';
import { currentEdition, memberProfile, randomToken } from '../membership';
import { enforceRateLimit } from '../rate-limit';
import { authedProcedure, memberProcedure, organizerProcedure, router } from '../trpc';

const GROUPS_PER_USER_PER_DAY = { window: 24 * 60 * 60, max: 10 };

const CreateGroupInput = v.object({
  name: GroupName,
  /** Only used while the account has no name yet. */
  organizerName: v.optional(PersonName),
  timeZone: TimeZone,
  giftDay: v.optional(GiftDay),
  exchangeMode: ExchangeMode,
  budget: v.optional(Price),
  kind: v.optional(EditionKind),
});

/** Keep-apart rows: 2+ people who don't draw each other; a person can be in several. */
const KeepApartInput = v.object({
  households: v.pipe(
    v.array(v.pipe(v.array(Id), v.minLength(2), v.maxLength(MAX_MEMBERS))),
    v.maxLength(MAX_MEMBERS * MAX_MEMBERS)
  ),
});

export const groupRouter = router({
  /** Group + first edition (open), organizer joined. Needs a verified session (no open relay, 43). */
  create: authedProcedure.input(CreateGroupInput).mutation(async ({ ctx, input }) => {
    await enforceRateLimit(`group:create:${ctx.user.id}`, GROUPS_PER_USER_PER_DAY);
    const today = todayIn(input.timeZone);
    if (input.giftDay && input.giftDay.date < today) throw new AppError('DATE_IN_PAST');
    const profile = await memberProfile(ctx.db, ctx.user.id, input.organizerName);

    const now = new Date();
    // The driver stores `undefined` as null, which the schemas reject: leave absent fields out.
    const optional = input.budget ? { budget: compactPrice(input.budget) } : {};
    // Kinds without a draw are played together, never by post.
    const exchangeMode = drawsNames(input) ? input.exchangeMode : 'inPerson';
    const organizer: Member = {
      id: newId(),
      userId: ctx.user.id,
      ...profile,
      role: 'organizer',
      status: 'joined',
      joinedAt: now,
      wishlistView: { shownWishIds: [] },
    };
    const group: Group = {
      _id: newId(),
      slug: randomToken(9),
      name: input.name,
      locale: ctx.user.locale === 'nl' ? 'nl' : 'en',
      timeZone: input.timeZone,
      createdBy: ctx.user.id,
      members: [organizer],
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
      title: defaultEditionTitle(year, [], input.kind),
      ...(input.kind && { kind: input.kind }),
      exchangeMode,
      ...optional,
      ...(input.giftDay && { giftDay: compactGiftDay(input.giftDay, exchangeMode) }),
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
    return { slug: group.slug, joinToken: group.joinLink!.token };
  }),

  /** Group home: the current edition (or `editionNumber`), people (emails for the organizer only), organizer tools. */
  get: memberProcedure
    .input(v.object({ editionNumber: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))) }))
    .query(async ({ ctx, input }) => {
      const editions = await ctx.db.editions
        .find({ groupId: ctx.group._id }, { projection: { number: 1, title: 1, kind: 1, status: 1, results: 1 }, sort: { number: -1 } })
        .toArray();
      const number = input.editionNumber ?? editions[0]?.number;
      const edition = number === undefined ? null : await ctx.db.editions.findOne({ groupId: ctx.group._id, number });
      if (input.editionNumber !== undefined && !edition) throw new AppError('EDITION_NOT_FOUND');
      return groupView(ctx.db, ctx.group, ctx.member, edition, editions);
    }),

  /** Keep-apart rows (26). Before the draw; refuses rows that make the draw impossible. */
  setKeepApart: organizerProcedure.input(KeepApartInput).mutation(async ({ ctx, input }) => {
    const edition = await currentEdition(ctx.db, ctx.group._id);
    if (edition && isDrawn(edition)) throw new AppError('ALREADY_DRAWN');
    const joined = new Set(ctx.group.members.filter((m) => m.status === 'joined').map((m) => m.id));
    const allJoined = input.households.flat().every((id) => joined.has(id));
    const distinct = input.households.every((ids) => new Set(ids).size === ids.length);
    if (!allJoined || !distinct) throw new AppError('INVALID_INPUT');
    const exclusions = toExclusions(input.households);
    const participants = edition ? drawParticipantIds(ctx.group, edition) : [];
    const stuck = participants.length >= MIN_PARTICIPANTS ? findStuckGivers(participants, exclusions) : null;
    if (stuck) throw new AppError('DRAW_IMPOSSIBLE');
    await ctx.db.groups.updateOne(
      { _id: ctx.group._id },
      {
        $set: {
          households: input.households.map((memberIds) => ({ id: newId(), memberIds })),
          updatedAt: new Date(),
        },
      }
    );
    return { ok: true };
  }),
});
