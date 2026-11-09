import { authClient } from '@/lib/client/auth';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

/** Private pages: the signed-in user, or a redirect to sign-in that comes back here. Null while loading. */
export const useRequireSession = () => {
  const router = useRouter();
  const { data, isPending } = authClient.useSession();

  useEffect(() => {
    if (isPending || data || !router.isReady) return;
    void router.replace(`/auth/sign-in?redirect=${encodeURIComponent(router.asPath)}`);
  }, [isPending, data, router]);

  return data?.user ?? null;
};
