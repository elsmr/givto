import { localePath, publicPathOf } from '@/components/shell/public-pages';
import { rememberLocale } from '@/components/shell/remember-locale';
import { ClientLocale } from '@/components/shell/use-preferred-locale';
import { authClient } from '@/lib/client/auth';
import { useCurrentUser } from '@/lib/client/session';
import { useTRPC } from '@/lib/client/trpc';
import type { Locale } from '@/lib/schema/common';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { useContext } from 'react';

/**
 * A manual language switch: remembered in a cookie, and on the account when signed in. Marketing
 * pages go to their other-language URL; app pages switch in place.
 */
export const useSetLocale = () => {
  const router = useRouter();
  const setClientLocale = useContext(ClientLocale);
  const signedIn = Boolean(useCurrentUser());
  const saveLocale = useMutation(useTRPC().account.setLocale.mutationOptions());

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
    const publicPath = publicPathOf(router.pathname);
    if (publicPath) await router.push(localePath(publicPath, locale));
    else setClientLocale(locale);
  };
};
