import { IconTile } from '@/components/ui/icon-tile';
import { CalendarClock, Link2, Mailbox, Repeat, Smartphone, Split } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { HomeSection, HomeSectionTitle } from './home-section';

const features = [
  { key: 'apart', icon: Split },
  { key: 'post', icon: Mailbox },
  { key: 'link', icon: Link2 },
  { key: 'reminders', icon: CalendarClock },
  { key: 'editions', icon: Repeat },
  { key: 'phones', icon: Smartphone },
] as const;

export const HomeFeatures = () => {
  const t = useTranslations('home.more');

  return (
    <HomeSection aria-labelledby="more-title">
      <HomeSectionTitle id="more-title" title={t('title')} />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ key, icon }) => (
          <li key={key} className="flex gap-4 bg-surface p-5 bordered shadow-md">
            <IconTile icon={icon} tone="yellow" />
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-bold">{t(`${key}.title`)}</h3>
              <p>{t(`${key}.description`)}</p>
            </div>
          </li>
        ))}
      </ul>
    </HomeSection>
  );
};
