import * as v from 'valibot';
import { Id } from '../../schema/common';
import type { Edition } from '../../schema/edition';
import type { Group } from '../../schema/group';
import type { Member } from '../../schema/member';
import { AppError } from '../errors';
import { editionProcedure, santaOfProcedure } from '../trpc';

export interface SantaRole {
  santa: Member;
  giftee: Member;
  /**
   * The caller manages the giftee, so questions and Psst! would land back with the caller
   * ("talking to yourself across roles"): asking and nudging are off.
   */
  answersOwnQuestions: boolean;
}

/**
 * The caller (or the managed member they act for) as a Santa in this edition, or null.
 * A manager acting for a managed Santa whose giftee is the manager gets null: otherwise
 * tips and questions about themselves would reach them.
 */
export const findSantaRole = (
  group: Group,
  edition: Edition,
  caller: Member,
  asMemberId: string | undefined
): SantaRole | null => {
  const santa = asMemberId
    ? group.members.find((m) => m.id === asMemberId && m.managedBy === caller.id)
    : caller;
  if (!santa) throw new AppError('FORBIDDEN');
  const gifteeId = edition.draw?.assignments[santa.id];
  const giftee = group.members.find((m) => m.id === gifteeId);
  if (!giftee || giftee.id === caller.id) return null;
  return { santa, giftee, answersOwnQuestions: giftee.managedBy === caller.id };
};

/** Queries for the Santa side: `ctx.santaRole` is null when the caller isn't a Santa here (no error, like claim.gifteeWishlist). */
export const santaViewProcedure = editionProcedure
  .input(v.object({ asMemberId: v.optional(Id) }))
  .use(({ ctx, input, next }) =>
    next({ ctx: { santaRole: findSantaRole(ctx.group, ctx.edition, ctx.member, input.asMemberId) } })
  );

/** Mutations for the Santa side: santaOfProcedure, minus the case where the giftee is the caller. */
export const santaActionProcedure = santaOfProcedure.use(({ ctx, next }) => {
  if (ctx.giftee.id === ctx.member.id) throw new AppError('NOT_SANTA');
  return next({ ctx: { answersOwnQuestions: ctx.giftee.managedBy === ctx.member.id } });
});

/** Ids the caller reads and answers giftee-side messages for: themselves and the members they manage. */
export const ownAndManagedIds = (group: Group, caller: Member): string[] => [
  caller.id,
  ...group.members.filter((m) => m.managedBy === caller.id).map((m) => m.id),
];
