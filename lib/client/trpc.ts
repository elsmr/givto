import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import { createTRPCContext } from '@trpc/tanstack-react-query';
import superjson from 'superjson';
import type { AppRouter } from '../server/routers';

/** `useTRPC()` gives query/mutation options: `useQuery(trpc.account.get.queryOptions())`. */
export const { TRPCProvider, useTRPC, useTRPCClient } = createTRPCContext<AppRouter>();

export const createTRPCHttpClient = () =>
  createTRPCClient<AppRouter>({
    links: [httpBatchLink({ url: '/api/trpc', transformer: superjson })],
  });

export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
