import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { authClient } from '@/lib/client/auth';
import { useTranslations } from 'next-intl';

export const SignOutEverywhere = () => {
  const t = useTranslations('account');

  const signOutEverywhere = async () => {
    const { error } = await authClient.revokeSessions();
    if (error) return toast.add({ title: t('errors.generic'), type: 'error' });
    await authClient.signOut();
    // A full load, so this page's own sign-in redirect doesn't race the navigation.
    location.assign('/');
  };

  return (
    <Button variant="neutral" className="self-start" onClick={signOutEverywhere}>
      {t('sessions.sign-out-everywhere')}
    </Button>
  );
};
