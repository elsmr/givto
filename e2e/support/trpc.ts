// tRPC over Playwright's `request` (superjson wire format like the app's client, no batching).
// Paths, inputs and outputs are typed from AppRouter; tests that send invalid input cast it (`as never`).
import { expect, type APIRequestContext } from '@playwright/test';
import type { AnyProcedure, inferProcedureInput, inferProcedureOutput, inferRouterError } from '@trpc/server';
import superjson from 'superjson';
import type { AppRouter } from '@/lib/server/routers';

type Procedures = AppRouter['_def']['record'];
type PathsOf<R, Type, Prefix extends string = ''> = {
  [K in keyof R & string]: R[K] extends AnyProcedure
    ? R[K]['_def']['type'] extends Type ? `${Prefix}${K}` : never
    : PathsOf<R[K], Type, `${Prefix}${K}.`>;
}[keyof R & string];
type ProcedureAt<R, P> = P extends `${infer Head}.${infer Rest}`
  ? ProcedureAt<R[Head & keyof R], Rest>
  : R[P & keyof R] extends AnyProcedure ? R[P & keyof R] : never;

export type QueryPath = PathsOf<Procedures, 'query'>;
export type MutationPath = PathsOf<Procedures, 'mutation'>;
export type TrpcInput<P> = inferProcedureInput<ProcedureAt<Procedures, P>>;
export type TrpcOutput<P> = inferProcedureOutput<ProcedureAt<Procedures, P>>;
/** `{ message, code, data: { appCode, requestId, issues?, details?, httpStatus, … } }` */
export type TrpcError = inferRouterError<AppRouter>;

export interface TrpcResult<T> {
  status: number;
  data: T | undefined;
  error: TrpcError | undefined;
}

export interface Trpc {
  query<P extends QueryPath>(path: P, input?: TrpcInput<P>): Promise<TrpcResult<TrpcOutput<P>>>;
  mutate<P extends MutationPath>(path: P, input?: TrpcInput<P>): Promise<TrpcResult<TrpcOutput<P>>>;
}

/** Calls go out with the context's cookies: one APIRequestContext per signed-in person. */
export const trpcClient = (request: APIRequestContext): Trpc => {
  const call = async (path: string, input: unknown, mutation: boolean) => {
    const payload = JSON.stringify(superjson.serialize(input ?? null));
    const res = mutation
      ? await request.post(`/api/trpc/${path}`, { headers: { 'content-type': 'application/json' }, data: payload })
      : await request.get(`/api/trpc/${path}?input=${encodeURIComponent(payload)}`);
    const body = await res.json();
    return {
      status: res.status(),
      data: body.result ? superjson.deserialize(body.result.data) : undefined,
      error: body.error?.json,
    };
  };
  return {
    query: (path, input) => call(path, input, false) as never,
    mutate: (path, input) => call(path, input, true) as never,
  };
};

/** The data of a successful call; fails the test with the error otherwise. */
export const ok = <T>(result: TrpcResult<T>): T => {
  expect(result.status, JSON.stringify(result.error)).toBe(200);
  return result.data as T;
};
