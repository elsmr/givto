import { ConspiracyAnimation } from '@/components/create/explainers/conspiracy';
import { SecretSantaAnimation } from '@/components/create/explainers/secret-santa';
import { WhiteElephantAnimation } from '@/components/create/explainers/white-elephant';
import { useTranslations } from 'next-intl';
import { HomeSection, HomeSectionTitle } from './home-section';

const games = [
  { key: 'secretSanta', Animation: SecretSantaAnimation },
  { key: 'whiteElephant', Animation: WhiteElephantAnimation },
  { key: 'conspiracy', Animation: ConspiracyAnimation },
] as const;

export const HomeGames = () => {
  const t = useTranslations('home.games');

  return (
    <HomeSection fill="yellow" aria-labelledby="games-title">
      <HomeSectionTitle id="games-title" title={t('title')} lead={t('lead')} />
      <ul className="grid gap-6 md:grid-cols-3">
        {games.map(({ key, Animation }) => (
          <li key={key} className="flex flex-col gap-4 bg-surface p-4 bordered shadow-lg sm:p-5">
            <Animation />
            <h3 className="text-2xl font-extrabold">{t(`${key}.title`)}</h3>
            <p>{t(`${key}.description`)}</p>
          </li>
        ))}
      </ul>
    </HomeSection>
  );
};
