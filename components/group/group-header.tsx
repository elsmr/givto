import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import Link from 'next/link';
import { formatBudget } from './format-budget';
import type { GroupData } from './group-data';

/** Greeting, group name, the edition with its budget and exchange chips, and Settings for the organizer (61). */
export const GroupHeader = ({ group }: { group: GroupData }) => {
  const t = useTranslations('group');
  const format = useFormatter();
  const me = group.members.find((m) => m.id === group.me.memberId);
  const { edition } = group;

  return (
    <div className="flex flex-col gap-2">
      {me && <p className="font-semibold text-muted">{t('hi', { name: me.name })}</p>}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="min-w-0 text-4xl font-extrabold break-words sm:text-5xl">{group.name}</h1>
        {group.me.isOrganizer && (
          <Link href={`/g/${group.slug}/settings`} className={buttonVariants({ variant: 'neutral' })}>
            <Settings aria-hidden="true" />
            {t('settings-link')}
          </Link>
        )}
      </div>
      {edition && (
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">{edition.title}</p>
          {edition.budget && <Badge variant="mint">{t('budget-chip', { budget: formatBudget(format, edition.budget) })}</Badge>}
          <Badge variant="primary-muted">{t(`summary.exchange-modes.${edition.exchangeMode}`)}</Badge>
        </div>
      )}
    </div>
  );
};
