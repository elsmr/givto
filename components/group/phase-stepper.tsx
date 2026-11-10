import { cn } from '@/lib/utils';
import { Check, Gift, PartyPopper, ShoppingBag, Shuffle, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { editionPhase, phases } from './edition-phase';
import type { GroupEdition } from './group-data';

const icons = { join: UserPlus, draw: Shuffle, shop: ShoppingBag, giftday: Gift, done: PartyPopper };

/** Where this edition is (61): past phases ticked, the current one raised, the rest muted. A status, not navigation. */
export const PhaseStepper = ({ edition }: { edition: GroupEdition }) => {
  const t = useTranslations('group.phase');
  const current = phases.indexOf(editionPhase(edition));

  return (
    <ol aria-label={t('label')} className="grid grid-cols-5 gap-0.5 bg-surface p-1 text-ink bordered sm:gap-1">
      {phases.map((phase, index) => {
        const Icon = index < current ? Check : icons[phase];
        return (
          <li
            key={phase}
            aria-current={index === current ? 'step' : undefined}
            className={cn(
              'flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 border-2 border-transparent px-0 py-1.5 text-center text-xs leading-tight font-bold sm:flex-row sm:gap-2 sm:text-sm',
              index < current && 'text-ink',
              index === current && '-translate-x-0.5 -translate-y-0.5 border-ink bg-yellow shadow-sm',
              index > current && 'font-semibold text-muted'
            )}
          >
            <Icon aria-hidden="true" className={cn('size-4 shrink-0', index < current && 'bg-mint p-0.5 text-ink outline-2 outline-ink')} />
            <span className="break-words hyphens-auto">{t(phase)}</span>
            {index < current && <span className="sr-only">{t('done-state')}</span>}
          </li>
        );
      })}
    </ol>
  );
};
