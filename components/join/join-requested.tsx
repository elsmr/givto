import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

/** Joined via a link that needs the organizer's approval (45). */
export const JoinRequested = ({ organizer }: { organizer: string }) => {
  const t = useTranslations('join.requested');

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <h1 className="text-4xl font-extrabold sm:text-5xl">{t('title')}</h1>
      <p className="text-lg">{t('description', { organizer })}</p>
      <Button className="self-start" nativeButton={false} render={<Link href="/groups" />}>
        {t('my-secret-santas')}
      </Button>
    </div>
  );
};
