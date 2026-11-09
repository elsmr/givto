import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/client/session';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/router';

/** Unknown slug and not-a-member look the same (memberProcedure); offer a way on. */
export const GroupNotFound = () => {
  const t = useTranslations('group.not-found');
  const router = useRouter();
  const switchAccount = async () => {
    await signOut();
    await router.replace(`/auth/sign-in?redirect=${encodeURIComponent(router.asPath)}`);
  };

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <h1 className="text-4xl font-extrabold sm:text-5xl">{t('title')}</h1>
      <p className="text-lg">{t('description')}</p>
      <div className="flex flex-col gap-3 xs:flex-row xs:flex-wrap">
        <Button nativeButton={false} render={<Link href="/groups" />}>
          {t('my-secret-santas')}
        </Button>
        <Button variant="neutral" onClick={() => void switchAccount()}>
          {t('switch-account')}
        </Button>
      </div>
    </div>
  );
};
