import { localePath } from '@/components/shell/public-pages';
import { IconTile } from '@/components/ui/icon-tile';
import { Code, EyeOff, Globe, KeyRound, Megaphone, ShieldCheck } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { HomeSection, HomeSectionTitle } from './home-section';

const promises = [
  { key: 'ads', icon: Megaphone },
  { key: 'passwords', icon: KeyRound },
  { key: 'secret', icon: EyeOff },
  { key: 'data', icon: ShieldCheck },
  { key: 'open', icon: Code },
  { key: 'app', icon: Globe },
] as const;

export const HomeWhy = () => {
  const t = useTranslations('home.why');
  const locale = useLocale();

  return (
    // The link colour is under 4.5:1 on this fill; links stay ink and underlined.
    <HomeSection fill="primary-muted" aria-labelledby="why-title" className="[&_a]:font-semibold [&_a]:text-ink">
      <HomeSectionTitle id="why-title" title={t('title')} lead={t('lead')} />
      <ul className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {promises.map(({ key, icon }) => (
          <li key={key} className="flex gap-4">
            <IconTile icon={icon} tone="yellow" className="size-12 shadow-sm [&>svg]:size-6" />
            <div className="flex flex-col gap-1">
              <h3 className="text-xl font-bold">{t(`${key}.title`)}</h3>
              <p>
                {t.rich(`${key}.description`, {
                  privacy: (chunks) => (
                    <Link href={localePath('/privacy', locale)} prefetch={false}>
                      {chunks}
                    </Link>
                  ),
                  github: (chunks) => <a href="https://github.com/elsmr/givto">{chunks}</a>,
                })}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </HomeSection>
  );
};
