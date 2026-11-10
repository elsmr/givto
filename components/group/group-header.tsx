import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
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
    <PageHeader
      eyebrow={me && t('hi', { name: me.name.split(' ')[0] })}
      title={group.name}
      actions={
        group.me.isOrganizer && (
          <Link href={`/g/${group.slug}/settings`} className={buttonVariants({ variant: 'neutral' })}>
            <Settings aria-hidden="true" />
            {t('settings-link')}
          </Link>
        )
      }
    >
      {edition && (
        <>
          <p className="font-semibold">{edition.title}</p>
          {edition.budget && <Badge variant="mint">{t('budget-chip', { budget: formatBudget(format, edition.budget) })}</Badge>}
          <Badge variant="primary-muted">{t(`summary.exchange-modes.${edition.exchangeMode}`)}</Badge>
        </>
      )}
    </PageHeader>
  );
};
