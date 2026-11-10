import { cn } from '@/lib/utils';
import { Check, Gift, PartyPopper, ShoppingBag, Shuffle, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { phases, type Phase } from './edition-phase';

const icons = { join: UserPlus, draw: Shuffle, shop: ShoppingBag, giftday: Gift, done: PartyPopper };

/**
 * Where an edition is (61), drawn as a progress track so it doesn't read as tabs: past phases
 * filled and ticked, the current one raised, the rest dashed. A status, not navigation.
 */
export const PhaseStepper = ({ phase, className }: { phase: Phase; className?: string }) => {
  const t = useTranslations('group.phase');
  const current = phases.indexOf(phase);

  return (
    <ol aria-label={t('label')} className={cn('grid grid-cols-5 gap-1 sm:gap-1.5', className)}>
      {phases.map((step, index) => {
        const Icon = index < current ? Check : icons[step];
        return (
          <li
            key={step}
            aria-current={index === current ? 'step' : undefined}
            className={cn('flex min-w-0 flex-col gap-1.5 text-xs leading-tight font-bold sm:text-sm', index > current && 'font-semibold text-muted')}
          >
            <span
              aria-hidden="true"
              className={cn(
                'h-3 border-2 border-outline',
                index < current && 'bg-mint',
                index === current && 'h-4 bg-yellow shadow-sm',
                index > current && 'border-dashed border-muted',
              )}
            />
            <span className="flex min-w-0 items-center gap-1">
              <Icon aria-hidden="true" className="size-4 shrink-0 max-[22rem]:hidden" />
              <span className="break-words hyphens-auto">{t(step)}</span>
            </span>
            {index < current && <span className="sr-only">{t('done-state')}</span>}
          </li>
        );
      })}
    </ol>
  );
};
