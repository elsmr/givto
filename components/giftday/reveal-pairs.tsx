import { cn } from '@/lib/utils';
import * as m from 'motion/react-m';
import { useTranslations } from 'next-intl';

type Pair = { giftee: string; santa: string };

/** Who was whose Santa, one by one. `large` for the presenter view. */
export const RevealPairs = ({ pairs, large = false }: { pairs: Pair[]; large?: boolean }) => {
  const t = useTranslations('giftday.reveal');

  return (
    <ul aria-label={t('pairs-label')} className={cn('grid gap-3', large && 'gap-5 md:grid-cols-2 xl:grid-cols-3')}>
      {pairs.map((pair, index) => (
        <m.li
          key={index}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: large ? 0.4 + index * 0.5 : index * 0.15 }}
          className={cn('bg-surface p-3 text-ink bordered shadow-sm', large && 'p-5 text-2xl xl:text-3xl dark:border-control dark:shadow-md dark:shadow-primary')}
        >
          {t.rich('pair', { ...pair, name: (chunks) => <strong className="break-words">{chunks}</strong> })}
        </m.li>
      ))}
    </ul>
  );
};
