import { cn } from '@/lib/utils';
import { Trophy } from 'lucide-react';
import { useTranslations } from 'next-intl';

type GuessScoreProps = { right: number; total: number; large?: boolean };

/** The scoreboard's count: "2 of 5 guessed their Santa". */
export const GuessScore = ({ right, total, large = false }: GuessScoreProps) => {
  const t = useTranslations('guess.result');

  return (
    <p className={cn('flex items-center gap-2 font-semibold', large && 'justify-center gap-3 text-2xl sm:text-4xl')}>
      <Trophy aria-hidden="true" className={large ? 'size-8 sm:size-10' : 'size-5'} />
      {t('score', { right, total })}
    </p>
  );
};
