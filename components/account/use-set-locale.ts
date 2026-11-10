import { rememberLocale } from '@/components/shell/remember-locale';
import { authClient } from '@/lib/client/auth';
import { useCurrentUser } from '@/lib/client/session';
import { useTRPC } from '@/lib/client/trpc';
import type { Locale } from '@/lib/schema/common';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/router';

/** A manual language switch: remembered in a cookie, and on the account when signed in. */
export const useSetLocale = () => {
  const router = useRouter();
  const signedIn = Boolean(useCurrentUser());
  const saveLocale = useMutation(useTRPC().me.setLocale.mutationOptions());

  return async (locale: Locale) => {
    rememberLocale(locale);
    if (signedIn) {
      // Best effort: if saving fails, the switch still applies here through the cookie.
      await saveLocale.mutateAsync({ locale }).then(
        // usePreferredLocale applies the account locale from the session.
        () => authClient.$store.notify('$sessionSignal'),
        () => undefined
      );
    }
    await router.push({ pathname: router.pathname, query: router.query }, router.asPath, { locale });
  };
};
