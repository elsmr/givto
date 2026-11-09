import { cn } from '@/lib/utils';
import { Hand, Lightbulb, Repeat, ScrollText } from 'lucide-react';
import { useTranslations } from 'next-intl';

const features = [
  { key: 'wishlist', Icon: ScrollText, fill: 'bg-coral' },
  { key: 'dibs', Icon: Hand, fill: 'bg-yellow' },
  { key: 'tips', Icon: Lightbulb, fill: 'bg-mint' },
  { key: 'editions', Icon: Repeat, fill: 'bg-primary-muted' },
] as const;

export const HomeFeatures = () => {
  const t = useTranslations('home.features');

  return (
    <section aria-labelledby="features-title" className="flex flex-col gap-8">
      <h2 id="features-title" className="text-3xl font-extrabold sm:text-4xl">
        {t('title')}
      </h2>
      <ul className="grid gap-6 sm:grid-cols-2">
        {features.map(({ key, Icon, fill }) => (
          <li key={key} className="flex flex-col gap-3 bg-surface p-5 bordered shadow-md">
            <span
              className={cn(
                'flex size-12 items-center justify-center bordered',
                fill,
              )}
            >
              <Icon aria-hidden="true" className="size-6" />
            </span>
            <h3 className="text-xl font-bold">{t(`${key}.title`)}</h3>
            <p>{t(`${key}.description`)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
};
