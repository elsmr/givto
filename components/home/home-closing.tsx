import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export const HomeClosing = () => {
  const t = useTranslations('home.closing');

  return (
    <section
      aria-labelledby="closing-title"
      className="flex flex-col items-start gap-6 bg-primary-muted p-6 bordered shadow-brand sm:flex-row sm:items-center sm:justify-between sm:p-8"
    >
      <h2 id="closing-title" className="text-2xl font-extrabold sm:text-3xl">
        {t('title')}
      </h2>
      <Button size="lg" nativeButton={false} render={<Link href="/new" />}>
        {t('cta')}
      </Button>
    </section>
  );
};
