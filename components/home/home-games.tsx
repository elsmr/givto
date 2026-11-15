import { ConspiracyAnimation } from '@/components/create/explainers/conspiracy';
import { SecretSantaAnimation } from '@/components/create/explainers/secret-santa';
import { WhiteElephantAnimation } from '@/components/create/explainers/white-elephant';
import { cn } from '@/lib/utils';
import { ArrowLeftRight, Gift, Play, VenetianMask } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type PointerEvent, useState } from 'react';
import { HomeSection, HomeSectionTitle } from './home-section';

const twists = [
  { key: 'whiteElephant', Animation: WhiteElephantAnimation, Icon: ArrowLeftRight },
  { key: 'conspiracy', Animation: ConspiracyAnimation, Icon: VenetianMask },
] as const;

/**
 * Still until asked: a mouse plays it while hovering the card, a tap starts or stops it. Decorative,
 * so no keyboard control; the card's text says the same.
 */
const usePlay = () => {
  const [playing, setPlaying] = useState(false);
  const hover = (on: boolean) => (event: PointerEvent) => {
    if (event.pointerType === 'mouse') setPlaying(on);
  };
  const handlers = {
    onPointerEnter: hover(true),
    onPointerLeave: hover(false),
    onPointerDown: (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') setPlaying(!playing);
    },
  };
  return [playing, handlers] as const;
};

const PlayHint = ({ playing }: { playing: boolean }) =>
  !playing && (
    <span aria-hidden="true" className="absolute top-2 right-2 grid size-6 place-items-center border-2 border-outline bg-surface text-ink shadow-sm">
      <Play className="size-3 fill-current" />
    </span>
  );

const card = 'flex touch-manipulation bg-surface bordered';

// Nearly every group is a Secret Santa, as on the create page: it gets the big card, the twists sit under it.
export const HomeGames = () => {
  const t = useTranslations('home.games');
  const [playing, play] = usePlay();

  return (
    <HomeSection fill="yellow" aria-labelledby="games-title">
      <HomeSectionTitle id="games-title" title={t('title')} lead={t('lead')} />
      <div className="flex flex-col gap-6">
        <div {...play} className={cn(card, 'flex-col gap-6 p-4 shadow-lg sm:p-6 md:flex-row md:items-center md:gap-10')}>
          <div className="relative select-none md:w-1/2">
            <SecretSantaAnimation playing={playing} className="aspect-[256/112] h-auto" />
            <PlayHint playing={playing} />
          </div>
          <div className="flex flex-col gap-3 md:w-1/2">
            <h3 className="flex items-center gap-3 text-3xl font-extrabold sm:text-4xl">
              <Gift aria-hidden="true" className="size-8 shrink-0" />
              {t('secretSanta.title')}
            </h3>
            <p className="text-lg">{t('secretSanta.description')}</p>
          </div>
        </div>
        <h3 className="font-heading text-xl font-bold">{t('twists')}</h3>
        <ul className="grid gap-6 md:grid-cols-2">
          {twists.map(({ key, Animation, Icon }) => (
            <Twist key={key} title={t(`${key}.title`)} description={t(`${key}.description`)} Animation={Animation} Icon={Icon} />
          ))}
        </ul>
      </div>
    </HomeSection>
  );
};

const Twist = ({
  title,
  description,
  Animation,
  Icon,
}: {
  title: string;
  description: string;
  Animation: (typeof twists)[number]['Animation'];
  Icon: (typeof twists)[number]['Icon'];
}) => {
  const [playing, play] = usePlay();

  return (
    <li {...play} className={cn(card, 'flex-col gap-4 p-4 shadow-md sm:flex-row sm:p-5')}>
      <div className="relative shrink-0 select-none sm:w-44">
        <Animation playing={playing} className="h-24" />
        <PlayHint playing={playing} />
      </div>
      <div className="flex flex-col gap-1">
        <h4 className="flex items-center gap-2 text-lg font-bold">
          <Icon aria-hidden="true" className="size-5 shrink-0" />
          {title}
        </h4>
        <p>{description}</p>
      </div>
    </li>
  );
};
