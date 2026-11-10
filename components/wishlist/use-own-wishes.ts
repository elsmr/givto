import { appErrorCode } from '@/components/group/app-error-code';
import { useTRPC } from '@/lib/client/trpc';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

/** The signed-in person's wishes; signed out, it sends them to sign in and back here. */
export const useOwnWishes = () => {
  const trpc = useTRPC();
  const router = useRouter();
  const query = useQuery(trpc.wish.list.queryOptions());
  const signedOut = appErrorCode(query.error) === 'UNAUTHENTICATED';

  useEffect(() => {
    if (signedOut) void router.replace(`/auth/sign-in?redirect=${encodeURIComponent(router.asPath)}`);
  }, [signedOut, router]);

  return { ...query, signedOut };
};
