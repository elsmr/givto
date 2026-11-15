import { GivtoLogo } from '@/components/givto-logo';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { IconTile } from '@/components/ui/icon-tile';
import { cn } from '@/lib/utils';
import { EyeOff, Hand, Lightbulb, MessageCircleQuestion, ScrollText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { HomeSection } from './home-section';

const mockCard = 'flex flex-col bg-surface text-ink bordered shadow-lg';
const label = 'mono text-xs font-semibold text-muted';

// Sample people; the fills match the app's avatar colours.
const Person = ({ name, fill, className }: { name: string; fill: string; className?: string }) => (
  <Avatar size="sm" className={className}>
    <AvatarFallback className={cn(fill, 'text-ink')}>{name[0]}</AvatarFallback>
  </Avatar>
);

const WishlistMock = () => {
  const t = useTranslations('home.spotlights.wishlist.mock');
  const wishes = [
    { key: 'socks', price: '€15', tags: [<Badge key="f">{t('family')}</Badge>, <Badge key="b">{t('friends')}</Badge>] },
    {
      key: 'game',
      price: '€35',
      tags: [
        <Badge key="f">{t('family')}</Badge>,
        <Badge key="d" variant="mint">
          <Hand />
          {t('dibs')}
        </Badge>,
      ],
    },
    {
      key: 'book',
      price: '€25',
      muted: true,
      tags: [
        <Badge key="h">
          <EyeOff />
          {t('hidden')}
        </Badge>,
      ],
    },
  ] as const;

  return (
    <div className={mockCard}>
      <div className="flex items-center gap-3 p-4 sm:p-5">
        <IconTile icon={ScrollText} tone="coral" />
        <span className="font-heading text-xl font-bold">{t('title')}</span>
      </div>
      {wishes.map(({ key, price, tags, ...wish }) => (
        <div key={key} className="flex flex-col gap-2 border-t-2 border-dashed border-outline p-4 sm:px-5">
          <div className={cn('flex items-baseline justify-between gap-4 font-semibold', 'muted' in wish && 'text-muted')}>
            <span>{t(key)}</span>
            <span className="mono text-sm">{price}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">{tags}</div>
        </div>
      ))}
    </div>
  );
};

const SecretsMock = () => {
  const t = useTranslations('home.spotlights.secrets.mock');

  return (
    <div className="flex flex-col gap-4">
      <div className={cn(mockCard, 'gap-3 p-4 sm:mr-10 sm:p-5')}>
        <div className="flex items-center gap-3">
          <IconTile icon={MessageCircleQuestion} tone="yellow" />
          <div className="flex flex-col">
            <span className={label}>{t('question')}</span>
            <span className="font-heading text-lg font-bold">{t('question-text')}</span>
          </div>
        </div>
        <p className="self-end bg-page px-3 py-2 bordered">{t('answer')}</p>
      </div>
      <div className={cn(mockCard, 'flex-row items-center gap-3 bg-coral p-4 sm:mx-5 sm:p-5')}>
        <span className="font-heading text-xl font-extrabold">{t('psst')}</span>
        <span>{t('psst-text')}</span>
      </div>
      <div className={cn(mockCard, 'flex-row items-center gap-3 p-4 sm:ml-10 sm:p-5')}>
        <IconTile icon={Lightbulb} tone="mint" />
        <div className="flex flex-col">
          <span className={label}>{t('tip')}</span>
          <span>{t('tip-text')}</span>
        </div>
      </div>
    </div>
  );
};

const order = [
  { name: 'Sam', fill: 'bg-yellow' },
  { name: 'Mia', fill: 'bg-coral' },
  { name: 'Ann', fill: 'bg-mint' },
  { name: 'Lou', fill: 'bg-primary-muted' },
  { name: 'Bob', fill: 'bg-yellow' },
];
const guesses = [
  { name: 'Ann', fill: 'bg-mint', count: 3 },
  { name: 'Lou', fill: 'bg-primary-muted', count: 1 },
  { name: 'Bob', fill: 'bg-yellow', count: 1 },
];

const GiftDayMock = () => {
  const t = useTranslations('home.spotlights.giftday.mock');

  return (
    <div className={cn(mockCard, 'gap-5 p-4 sm:p-6')}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className={label}>{t('now')}</span>
          <span className="font-heading text-4xl font-extrabold sm:text-5xl">Mia</span>
        </div>
        <GivtoLogo className="size-16 shrink-0 rotate-6 overflow-visible sm:size-20" />
      </div>
      <div className="flex gap-1.5">
        {order.map(({ name, fill }, index) => (
          <Person key={name} name={name} fill={fill} className={cn(index === 1 ? 'shadow-md' : index === 0 && 'opacity-50')} />
        ))}
      </div>
      <div className="flex flex-col gap-3 border-t-2 border-dashed border-outline pt-4">
        <span className="font-heading text-lg font-bold">{t('guess')}</span>
        {guesses.map(({ name, fill, count }) => (
          <div key={name} className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
            <Person name={name} fill={fill} />
            <span className={cn('h-4 border-2 border-outline', fill)} style={{ width: `${(count / 3) * 100}%` }} />
            <span className="mono text-xs font-semibold">{t('votes', { count })}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const spotlights: { key: 'wishlist' | 'secrets' | 'giftday'; mock: ReactNode; sticker: string }[] = [
  { key: 'wishlist', mock: <WishlistMock />, sticker: '-top-5 -right-3 rotate-6 bg-mint' },
  { key: 'secrets', mock: <SecretsMock />, sticker: '-top-5 -left-3 -rotate-6 bg-yellow' },
  { key: 'giftday', mock: <GiftDayMock />, sticker: '-bottom-5 -left-3 -rotate-3 bg-coral' },
];

/** The differentiators, each next to a mock built from the app's parts with sample data. */
export const HomeSpotlights = () => {
  const t = useTranslations('home.spotlights');

  return (
    <HomeSection className="gap-20 sm:gap-28">
      {spotlights.map(({ key, mock, sticker }, index) => (
        <div key={key} className="grid items-center gap-8 md:grid-cols-2 md:gap-16">
          <div className={cn('flex flex-col gap-4', index % 2 === 1 && 'md:order-last')}>
            <h2 className="text-3xl font-extrabold text-balance sm:text-4xl">{t(`${key}.title`)}</h2>
            <p className="text-lg">{t(`${key}.description`)}</p>
          </div>
          {/* Sample data, not content: the text next to it says what it shows. */}
          <div aria-hidden="true" className="relative select-none">
            <span
              className={cn('absolute z-10 px-3 py-1 font-heading text-xl font-extrabold text-ink bordered shadow-md', sticker)}
            >
              {t(`${key}.mock.sticker`)}
            </span>
            {mock}
          </div>
        </div>
      ))}
    </HomeSection>
  );
};
