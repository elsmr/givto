import { ConspiracyAnimation } from '@/components/create/explainers/conspiracy';
import { SecretSantaAnimation } from '@/components/create/explainers/secret-santa';
import { WhiteElephantAnimation } from '@/components/create/explainers/white-elephant';
import { FieldHint } from '@/components/ui/field';
import { cn } from '@/lib/utils';
import { ArrowLeftRight, Gift, VenetianMask } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ComponentType } from 'react';
import { HomeSection, HomeSectionTitle } from './home-section';

const twists = [
  { key: 'whiteElephant', Animation: WhiteElephantAnimation, Icon: ArrowLeftRight },
  { key: 'conspiracy', Animation: ConspiracyAnimation, Icon: VenetianMask },
] as const;

/** Each game's animation behind its (?), as on the create page. */
const Explainer = ({ name, Animation }: { name: string; Animation: ComponentType }) => {
  const t = useTranslations('home.games');
  return (
    <div className="absolute top-0 right-0 [&>button]:m-0">
      <FieldHint label={t('about', { name })}>
        <Animation />
      </FieldHint>
    </div>
  );
};

const card = 'relative flex bg-surface bordered';

// Nearly every group is a Secret Santa, as on the create page: it gets the big card, the twists sit under it.
export const HomeGames = () => {
  const t = useTranslations('home.games');

  return (
    <HomeSection aria-labelledby="games-title">
      <HomeSectionTitle id="games-title" title={t('title')} />
      <div className="flex flex-col gap-6">
        <div className={cn(card, 'flex-col gap-3 p-4 pr-12 shadow-lg sm:p-6 sm:pr-12')}>
          <h3 className="flex items-center gap-3 text-3xl font-extrabold sm:text-4xl">
            <Gift aria-hidden="true" className="size-8 shrink-0" />
            {t('secretSanta.title')}
          </h3>
          <p className="text-lg">{t('secretSanta.description')}</p>
          <Explainer name={t('secretSanta.title')} Animation={SecretSantaAnimation} />
        </div>
        <ul className="grid gap-6 md:grid-cols-2">
          {twists.map(({ key, Animation, Icon }) => (
            <li key={key} className={cn(card, 'flex-col gap-1 p-4 pr-12 shadow-md sm:p-5 sm:pr-12')}>
              <h3 className="flex items-center gap-2 text-lg font-bold">
                <Icon aria-hidden="true" className="size-5 shrink-0" />
                {t(`${key}.title`)}
              </h3>
              <p>{t(`${key}.description`)}</p>
              <Explainer name={t(`${key}.title`)} Animation={Animation} />
            </li>
          ))}
        </ul>
      </div>
    </HomeSection>
  );
};
