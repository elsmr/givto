import { GivtoLogo } from '@/components/givto-logo';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export const EmptyState = () => {
  const t = useTranslations('dashboard');

  return (
    <div className="flex flex-col items-start gap-5 bg-surface p-6 bordered shadow-md">
      <GivtoLogo aria-hidden="true" className="size-16 -rotate-6" />
      <h2 className="text-2xl font-bold">{t('empty.title')}</h2>
      <p className="max-w-prose text-lg">{t('empty.body')}</p>
      <Button size="lg" nativeButton={false} render={<Link href="/new" />}>
        {t('start')}
      </Button>
    </div>
  );
};
