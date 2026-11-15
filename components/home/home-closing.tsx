import { LogoAnimation } from '@/components/logo-animation/logo-animation';
import { buttonVariants } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export const HomeClosing = () => {
  const t = useTranslations('home.closing');

  return (
    <section aria-labelledby="closing-title" className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6 sm:pb-24">
      <div className="flex flex-col items-start gap-6 bg-yellow p-6 bordered shadow-brand sm:flex-row sm:items-center sm:gap-8 sm:p-10">
        <LogoAnimation variant="toy" className="size-20 shrink-0 -rotate-6 touch-manipulation select-none sm:size-28" />
        <div className="flex flex-1 flex-col gap-2">
          <h2 id="closing-title" className="text-3xl font-extrabold sm:text-4xl">
            {t('title')}
          </h2>
          <p className="text-lg">{t('lead')}</p>
        </div>
        <Link href="/new" className={buttonVariants({ size: 'lg' })}>
          {t('cta')}
        </Link>
      </div>
    </section>
  );
};
