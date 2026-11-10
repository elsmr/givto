import { authClient, safeRedirect } from '@/lib/client/auth';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';

const dropHash = () => {
  if (location.hash) history.replaceState(history.state, '', location.pathname + location.search);
};

/**
 * The emailed link carries `#token=…&callbackURL=…`. Fragments never reach the server, so
 * the token stays out of request logs; it's posted here and removed from the address bar.
 */
export const useMagicLinkSignIn = () => {
  const router = useRouter();
  const started = useRef(false);
  const [failed, setFailed] = useState(false);
  const [callbackURL, setCallbackURL] = useState('/app');

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const params = new URLSearchParams(location.hash.slice(1));
    const token = params.get('token');
    const target = safeRedirect(params.get('callbackURL'), '/app');
    setCallbackURL(target);
    if (!token) {
      setFailed(true);
      return;
    }
    void authClient.$fetch('/magic-link/verify-token', { method: 'POST', body: { token } }).then(({ error }) => {
      // A full load: the language redirect on this page may still be in flight.
      if (error) setFailed(true);
      else location.replace(target);
    });
  }, []);

  // Runs after the effect above, and again after the language redirect, which keeps the hash.
  useEffect(dropHash, [router.asPath]);

  return { failed, callbackURL };
};
