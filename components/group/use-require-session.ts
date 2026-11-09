import { authClient } from '@/lib/client/auth';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

/** Members-only pages: logged-out visitors go to sign-in and come back here afterwards. */
export const useRequireSession = () => {
  const router = useRouter();
  const { data, isPending } = authClient.useSession();
  const signedOut = !isPending && !data;

  useEffect(() => {
    if (signedOut) void router.replace(`/auth/sign-in?redirect=${encodeURIComponent(router.asPath)}`);
  }, [signedOut, router]);

  return data?.user ?? null;
};
