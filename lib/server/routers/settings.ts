import * as v from 'valibot';
import { todayIn, zonedInstant } from '../../local-date';
import { Id, TimeZone } from '../../schema/common';
import { GroupName, MAX_MEMBERS } from '../../schema/group';
import { isBeforeDraw, type Participant } from '../../schema/edition';
import { AppError } from '../errors';
import { removeMember } from '../remove-member';
import { organizerEditionProcedure, organizerProcedure, router } from '../trpc';
import { DRAW_TIME, setAvoidPrevious, updateEdition } from './settings-edition';

/** Organizer settings (27): every change is checked here, not only in the form. */
export const settingsRouter = router({
  rename: organizerProcedure.input(v.object({ name: GroupName })).mutation(async ({ ctx, input }) => {
    await ctx.db.groups.updateOne({ _id: ctx.group._id }, { $set: { name: input.name, updatedAt: new Date() } });
    return { ok: true };
  }),

  /**
   * The group's time zone. Edition dates are local dates, so they stay; a scheduled draw keeps its
   * local date and time, and gift day calendar events get a new sequence.
   */
  setTimeZone: organizerProcedure.input(v.object({ timeZone: TimeZone })).mutation(async ({ ctx, input }) => {
    const { timeZone: from, _id: groupId } = ctx.group;
    const to = input.timeZone;
    if (to === from) return { ok: true };
    const now = new Date();
    await ctx.db.groups.updateOne({ _id: groupId }, { $set: { timeZone: to, updatedAt: now } });
    const editions = await ctx.db.editions.find({ groupId, status: { $ne: 'done' } }).toArray();
    await Promise.all(
      editions.map((edition) =>
        ctx.db.editions.updateOne(
          { _id: edition._id },
          {
            $set: {
              ...(edition.drawAt && isBeforeDraw(edition) && { drawAt: zonedInstant(todayIn(from, edition.drawAt), DRAW_TIME, to) }),
              updatedAt: now,
            },
            ...(edition.giftDay && { $inc: { calendarSequence: 1 } }),
          }
        )
      )
    );
    return { ok: true };
  }),

  /** Edition details and dates (28); see `updateEdition` for the rules. */
  updateEdition,

  setAvoidPrevious,

  /** Who's in this edition: tick or untick joined and invited people before the draw (33, 98). */
  setParticipants: organizerEditionProcedure
    .input(v.object({ memberIds: v.pipe(v.array(Id), v.maxLength(MAX_MEMBERS)) }))
    .mutation(async ({ ctx, input }) => {
      const { edition } = ctx;
      if (!isBeforeDraw(edition)) throw new AppError('ALREADY_DRAWN');
      const invited = new Set(ctx.group.members.filter((m) => m.status === 'invited').map((m) => m.id));
      const joined = new Set(ctx.group.members.filter((m) => m.status === 'joined').map((m) => m.id));
      if (!input.memberIds.every((id) => joined.has(id) || invited.has(id))) throw new AppError('INVALID_INPUT');
      const ticked = new Set(input.memberIds);
      const listed = new Set(edition.participants.map((p) => p.memberId));
      const now = new Date();
      const participants: Participant[] = [
        ...edition.participants.map((p) => ({ ...p, participates: ticked.has(p.memberId) })),
        ...[...ticked]
          .filter((id) => !listed.has(id))
          .map((memberId): Participant => ({ memberId, participates: true, status: invited.has(memberId) ? 'invited' : 'joined', addedAt: now })),
      ];
      const saved = await ctx.db.editions.updateOne(
        { _id: edition._id, status: edition.status, updatedAt: edition.updatedAt },
        { $set: { participants, updatedAt: now } }
      );
      if (saved.matchedCount === 0) throw new AppError('EDITION_CHANGED');
      return { ok: true };
    }),

  /** Take someone out of the group, also after the draw (the draw is patched, 48). */
  removePerson: organizerProcedure.input(v.object({ memberId: Id })).mutation(async ({ ctx, input }) => {
    const person = ctx.group.members.find((m) => m.id === input.memberId && m.status !== 'removed');
    if (!person) throw new AppError('NOT_FOUND');
    if (person.role === 'organizer') throw new AppError('ORGANIZER_CANNOT_LEAVE');
    await removeMember(ctx.db, ctx.group, person.id);
    return { ok: true };
  }),

  /** Danger zone: the group disappears for everyone (soft delete; slugs keep answering GROUP_NOT_FOUND). */
  deleteGroup: organizerProcedure.mutation(async ({ ctx }) => {
    const now = new Date();
    await ctx.db.groups.updateOne({ _id: ctx.group._id }, { $set: { deletedAt: now, updatedAt: now } });
    return { ok: true };
  }),
});
