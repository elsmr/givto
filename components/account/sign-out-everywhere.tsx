import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { authClient } from '@/lib/client/auth';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/router';

export const SignOutEverywhere = () => {
  const t = useTranslations('account');
  const router = useRouter();

  const signOutEverywhere = async () => {
    const { error } = await authClient.revokeSessions();
    if (error) return toast.add({ title: t('errors.generic'), type: 'error' });
    await authClient.signOut();
    await router.push('/');
  };

  return (
    <Button variant="neutral" className="self-start" onClick={signOutEverywhere}>
      {t('sessions.sign-out-everywhere')}
    </Button>
  );
};
