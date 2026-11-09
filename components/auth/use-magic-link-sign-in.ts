import { authClient, safeRedirect } from '@/lib/client/auth';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';

/**
 * The emailed link carries `#token=…&callbackURL=…`. Fragments never reach the server, so
 * the token stays out of request logs; it's posted here and removed from the address bar.
 */
export const useMagicLinkSignIn = () => {
  const router = useRouter();
  const started = useRef(false);
  const [failed, setFailed] = useState(false);
  const [callbackURL, setCallbackURL] = useState('/groups');

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const params = new URLSearchParams(location.hash.slice(1));
    const token = params.get('token');
    const target = safeRedirect(params.get('callbackURL'), '/groups');
    setCallbackURL(target);
    history.replaceState(history.state, '', location.pathname + location.search);
    if (!token) {
      setFailed(true);
      return;
    }
    void authClient
      .$fetch('/magic-link/verify-token', { method: 'POST', body: { token } })
      .then(async ({ error }) => {
        if (error) return setFailed(true);
        authClient.$store.notify('$sessionSignal');
        await router.replace(target);
      });
  }, [router]);

  return { failed, callbackURL };
};
