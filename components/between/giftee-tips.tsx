import { useTRPC } from '@/lib/client/trpc';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import type { EditionInput } from './edition-input';
import { TipUsedButton } from './tip-used-button';

/** "Tips from others": what others told your giftee's Santa, named or anonymous. Nothing while there are none. */
export const GifteeTips = ({ input }: { input: EditionInput }) => {
  const t = useTranslations('between.santa');
  const trpc = useTRPC();
  const view = useQuery(trpc.tip.forGiftee.queryOptions(input)).data;

  if (!view || view.tips.length === 0) return null;
  const authorLabel = (tip: (typeof view.tips)[number]) =>
    tip.mine ? t('tip-yours') : tip.author ? t('tip-from', { name: tip.author.name }) : t('tip-anonymous');

  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-heading text-lg font-bold">{t('tips-title')}</h3>
      <ul className="flex flex-col gap-3">
        {view.tips.map((tip) => (
          <li key={tip.id} className="flex items-start gap-3 border-l-4 border-yellow pl-3">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p id={`tip-${tip.id}`} className={cn('break-words whitespace-pre-line', tip.used && 'text-muted line-through')}>
                {tip.text}
              </p>
              <span className="text-sm text-muted">{authorLabel(tip)}</span>
            </div>
            {view.canMarkUsed && <TipUsedButton input={input} tipId={tip.id} textId={`tip-${tip.id}`} used={tip.used} />}
          </li>
        ))}
      </ul>
    </section>
  );
};
