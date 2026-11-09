import { initTRPC } from '@trpc/server';
import type { CreateNextContextOptions } from '@trpc/server/adapters/next';
import { fromNodeHeaders } from 'better-auth/node';
import superjson from 'superjson';
import * as v from 'valibot';
import { Id } from '../schema/common';
import { Slug } from '../schema/group';
import { getAuth } from './auth';
import { getDb } from './db';
import { AppError, errorData, GENERIC_ERROR_MESSAGE, isUnexpected, toAppCode } from './errors';
import { log } from './log';

/** `pages/api/trpc/[trpc].ts` sets this header before tRPC runs, so even failed contexts have an id. */
export const REQUEST_ID_HEADER = 'x-request-id';

export const createContext = async ({ req }: CreateNextContextOptions) => {
  const requestId = String(req.headers[REQUEST_ID_HEADER]);
  const [db, session] = await Promise.all([
    getDb(),
    getAuth().api.getSession({ headers: fromNodeHeaders(req.headers) }),
  ]);
  return { requestId, log: log.child({ requestId }), db, session };
};
export type Context = Awaited<ReturnType<typeof createContext>>;

/**
 * superjson keeps Dates (and Maps/Sets) intact over the wire, so outputs can use the
 * document types as-is. The client link uses the same transformer (lib/client/trpc.ts).
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter: ({ shape, error, ctx }) => ({
    ...shape,
    message: isUnexpected(error) ? GENERIC_ERROR_MESSAGE : shape.message,
    data: {
      code: shape.data.code,
      httpStatus: shape.data.httpStatus,
      path: shape.data.path,
      ...errorData(error, ctx?.requestId),
    },
  }),
});

/** Errors already logged by `withLogging`; `onError` in the API route logs the rest (once). */
export const loggedErrors = new WeakSet<Error>();

/** Filled in by the procedures below, so the one log line per call carries user and group. */
interface LogMeta {
  userId?: string;
  groupId?: string;
  editionId?: string;
}

const withLogging = t.middleware(async ({ ctx, path, next }) => {
  const meta: LogMeta = { userId: ctx.session?.user.id };
  const started = performance.now();
  const result = await next({ ctx: { meta, log: ctx.log.child({ procedure: path }) } });
  const fields = { procedure: path, ...meta, durationMs: Math.round(performance.now() - started) };
  if (result.ok) {
    ctx.log.info(fields, 'procedure ok');
  } else {
    loggedErrors.add(result.error);
    const appCode = toAppCode(result.error);
    if (isUnexpected(result.error)) {
      ctx.log.error({ ...fields, appCode, err: result.error.cause ?? result.error }, 'procedure failed');
    } else {
      ctx.log.info({ ...fields, appCode }, 'procedure rejected');
    }
  }
  return result;
});

export const router = t.router;

export const publicProcedure = t.procedure.use(withLogging);

/** Signed in. `ctx.user`: id, email, name, locale. */
export const authedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.session) throw new AppError('UNAUTHENTICATED');
  return next({ ctx: { user: ctx.session.user, session: ctx.session.session } });
});

/**
 * Input `{ groupSlug }`. A joined member of the group: `ctx.group`, `ctx.member`. Anyone
 * else gets GROUP_NOT_FOUND, so slugs don't reveal which groups exist.
 */
export const memberProcedure = authedProcedure
  .input(v.object({ groupSlug: Slug }))
  .use(async ({ ctx, input, next }) => {
    const group = await ctx.db.groups.findOne({
      slug: input.groupSlug,
      deletedAt: { $exists: false },
      members: { $elemMatch: { userId: ctx.user.id, status: 'joined' } },
    });
    const member = group?.members.find((m) => m.userId === ctx.user.id && m.status === 'joined');
    if (!group || !member) throw new AppError('GROUP_NOT_FOUND');
    ctx.meta.groupId = group._id;
    return next({ ctx: { group, member, log: ctx.log.child({ groupId: group._id }) } });
  });

/** Input `{ groupSlug }`. The group's organizer. */
export const organizerProcedure = memberProcedure.use(({ ctx, next }) => {
  if (ctx.member.role !== 'organizer') throw new AppError('NOT_ORGANIZER');
  return next();
});

/** Input `{ groupSlug, editionNumber }`. A member, plus that edition of the group: `ctx.edition`. */
export const editionProcedure = memberProcedure
  .input(v.object({ editionNumber: v.pipe(v.number(), v.integer(), v.minValue(1)) }))
  .use(async ({ ctx, input, next }) => {
    const edition = await ctx.db.editions.findOne({ groupId: ctx.group._id, number: input.editionNumber });
    if (!edition) throw new AppError('EDITION_NOT_FOUND');
    ctx.meta.editionId = edition._id;
    return next({ ctx: { edition, log: ctx.log.child({ editionId: edition._id }) } });
  });

/**
 * Input `{ groupSlug, editionNumber, asMemberId? }`. The caller is a Santa in this edition's
 * draw: `ctx.santa` (the member giving) and `ctx.giftee`. Use it for giftee-scoped data
 * (wishlist view, claims, tips, questions, nudges). `asMemberId`: act for a managed member
 * the caller manages (40), e.g. a parent buying on behalf of their kid.
 */
export const santaOfProcedure = editionProcedure
  .input(v.object({ asMemberId: v.optional(Id) }))
  .use(({ ctx, input, next }) => {
    const santa = input.asMemberId
      ? ctx.group.members.find((m) => m.id === input.asMemberId && m.managedBy === ctx.member.id)
      : ctx.member;
    if (!santa) throw new AppError('FORBIDDEN');
    if (!ctx.edition.draw) throw new AppError('NOT_DRAWN');
    const gifteeId = ctx.edition.draw.assignments[santa.id];
    const giftee = ctx.group.members.find((m) => m.id === gifteeId);
    if (!giftee) throw new AppError('NOT_SANTA');
    return next({ ctx: { santa, giftee } });
  });
