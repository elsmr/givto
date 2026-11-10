import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';
import * as m from 'motion/react-m';
import { useTranslations } from 'next-intl';

type GuessVerdictProps = { right: boolean; large?: boolean; delay?: number; className?: string };

/** "Nailed it!" (mint, tick) or "Not quite" (coral, cross), popping in after `delay` seconds. `large` for the presenter. */
export const GuessVerdict = ({ right, large = false, delay = 0, className }: GuessVerdictProps) => {
  const t = useTranslations('guess.result');
  const Icon = right ? Check : X;

  return (
    <m.span
      initial={{ scale: 0.4, opacity: 0, rotate: -8 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 420, damping: 14, delay }}
      className={cn(
        'inline-flex w-fit items-center gap-1.5 border-2 border-outline px-2 py-0.5 font-bold text-ink',
        right ? 'bg-mint' : 'bg-coral',
        large && 'gap-3 px-5 py-2 text-3xl shadow-md sm:text-5xl',
        className
      )}
    >
      <Icon aria-hidden="true" className={large ? 'size-8 sm:size-12' : 'size-4'} strokeWidth={3} />
      {right ? t('right') : t('wrong')}
    </m.span>
  );
};
