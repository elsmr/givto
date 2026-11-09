import type { RouterOutputs } from '@/lib/client/trpc';
import { useTranslations } from 'next-intl';
import type { EditionInput } from './edition-input';
import { TipUsedButton } from './tip-used-button';

type GifteeTipsView = NonNullable<RouterOutputs['tip']['forGiftee']>;

/** "Tips for you": what others told your giftee's Santa, named or anonymous. */
export const GifteeTips = ({ input, view }: { input: EditionInput; view: GifteeTipsView }) => {
  const t = useTranslations('between.santa');
  const authorLabel = (tip: GifteeTipsView['tips'][number]) =>
    tip.mine ? t('tip-yours') : tip.author ? t('tip-from', { name: tip.author.name }) : t('tip-anonymous');

  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-heading text-lg font-bold">{t('tips-title')}</h3>
      {view.tips.length === 0 ? (
        <p>{t('tips-empty', { name: view.giftee.name })}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {view.tips.map((tip) => (
            <li key={tip.id} className="flex flex-col gap-2 border-b-2 border-ink pb-3 last:border-b-0">
              <p id={`tip-${tip.id}`} className={tip.used ? 'break-words whitespace-pre-line text-muted line-through' : 'break-words whitespace-pre-line'}>
                {tip.text}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-muted">{authorLabel(tip)}</span>
                {view.canMarkUsed && <TipUsedButton input={input} tipId={tip.id} textId={`tip-${tip.id}`} used={tip.used} />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
