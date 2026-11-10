import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TRPCClientError } from '@trpc/client';
import { useState, type ReactNode } from 'react';
import { createTRPCHttpClient, TRPCProvider } from './trpc';

// Retrying a 4xx (not signed in, not a member, invalid input) can't succeed.
const retry = (failureCount: number, error: unknown) =>
  failureCount < 2 &&
  !(error instanceof TRPCClientError && (error.data?.httpStatus ?? 500) < 500);

export const Providers = ({ children }: { children: ReactNode }) => {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry } } })
  );
  const [trpcClient] = useState(createTRPCHttpClient);
  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  );
};
