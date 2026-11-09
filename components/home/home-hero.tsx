import { GivtoLogo } from '@/components/givto-logo';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export const HomeHero = () => {
  const t = useTranslations('home.hero');

  return (
    <section
      aria-labelledby="home-title"
      className="grid items-center gap-10 md:grid-cols-[1fr_auto] md:gap-16"
    >
      <div className="flex flex-col items-start gap-6">
        <Badge variant="yellow" className="text-sm">
          {t('eyebrow')}
        </Badge>
        <h1
          id="home-title"
          className="text-4xl leading-[1.05] font-extrabold text-balance xs:text-5xl lg:text-6xl"
        >
          {t('title')}
        </h1>
        <p className="max-w-xl text-lg sm:text-xl">{t('lead')}</p>
        <div className="flex w-full flex-col gap-4 xs:w-auto xs:flex-row">
          <Link href="/new" className={buttonVariants({ size: 'lg' })}>
            {t('cta')}
          </Link>
          <a
            href="#how-it-works"
            className={buttonVariants({ size: 'lg', variant: 'neutral' })}
          >
            {t('how-it-works')}
          </a>
        </div>
        <p className="text-muted">{t('note')}</p>
      </div>
      <GivtoLogo
        aria-hidden="true"
        className="mx-auto w-36 -rotate-6 xs:w-44 md:w-64"
      />
    </section>
  );
};
