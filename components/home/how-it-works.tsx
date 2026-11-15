import { cn } from '@/lib/utils';
import { Gift, ScrollText, Shuffle, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { HomeSection, HomeSectionTitle } from './home-section';

const steps = [
  { key: 'start', Icon: UserPlus, fill: 'bg-primary-muted' },
  { key: 'draw', Icon: Shuffle, fill: 'bg-yellow' },
  { key: 'wishlists', Icon: ScrollText, fill: 'bg-mint' },
  { key: 'gift-day', Icon: Gift, fill: 'bg-coral' },
] as const;

// The track echoes the group page's phase stepper.
export const HowItWorks = () => {
  const t = useTranslations('home.steps');

  return (
    <HomeSection fill="surface" id="how-it-works" aria-labelledby="how-it-works-title">
      <HomeSectionTitle id="how-it-works-title" title={t('title')} />
      <ol className="grid gap-x-3 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(({ key, Icon, fill }, index) => (
          <li key={key} className="flex flex-col gap-4">
            <span aria-hidden="true" className={cn('h-4 border-2 border-outline shadow-sm', fill)} />
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className={cn('flex size-11 shrink-0 items-center justify-center text-ink bordered', fill)}
              >
                <Icon className="size-6" />
              </span>
              <span className="mono text-sm font-semibold text-muted">0{index + 1}</span>
            </div>
            <h3 className="text-2xl font-extrabold">{t(`${key}.title`)}</h3>
            <p>{t(`${key}.description`)}</p>
          </li>
        ))}
      </ol>
    </HomeSection>
  );
};
