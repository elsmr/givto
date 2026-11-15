import { LogoAnimation } from '@/components/logo-animation/logo-animation';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Code, Gift, KeyRound, Megaphone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

const claims = [
  { key: 'free', Icon: Gift, variant: 'mint' },
  { key: 'ads', Icon: Megaphone, variant: 'coral' },
  { key: 'passwords', Icon: KeyRound, variant: 'yellow' },
  { key: 'open', Icon: Code, variant: 'primary-muted' },
] as const;

export const HomeHero = () => {
  const t = useTranslations('home.hero');

  return (
    <section
      aria-labelledby="home-title"
      className="mx-auto grid w-full max-w-5xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-20 md:grid-cols-[1fr_auto] md:gap-16"
    >
      <div className="flex flex-col items-start gap-6">
        <Badge variant="yellow" className="text-sm">
          {t('eyebrow')}
        </Badge>
        <h1 id="home-title" className="text-4xl leading-[1.05] font-extrabold text-balance xs:text-5xl lg:text-6xl">
          {t('title')}
        </h1>
        <p className="max-w-xl text-lg sm:text-xl">{t('lead')}</p>
        <div className="flex w-full flex-col gap-4 xs:w-auto xs:flex-row">
          <Link href="/new" className={buttonVariants({ size: 'lg' })}>
            {t('cta')}
          </Link>
          <a href="#how-it-works" className={buttonVariants({ size: 'lg', variant: 'neutral' })}>
            {t('how-it-works')}
          </a>
        </div>
        <ul aria-label={t('claims')} className="flex flex-wrap gap-2">
          {claims.map(({ key, Icon, variant }) => (
            <li key={key}>
              <Badge variant={variant} className="text-sm [&>svg]:size-4">
                <Icon aria-hidden="true" />
                {t(`claim.${key}`)}
              </Badge>
            </li>
          ))}
        </ul>
      </div>
      <LogoAnimation
        variant="toy"
        className="mx-auto size-36 -rotate-6 touch-manipulation select-none xs:size-44 md:size-64"
      />
    </section>
  );
};
