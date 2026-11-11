import { drawsNames } from '@/lib/schema/edition';
import { statusTone } from './edition-phase';
import { Badge } from '@/components/ui/badge';
import { DisclosureCard } from '@/components/ui/disclosure-card';
import { History, Trophy } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import Link from 'next/link';
import type { GroupData } from './group-data';

/** Every edition of the group, newest first (33), collapsed. Only once there's history. */
export const EditionsList = ({ group, shownNumber }: { group: GroupData; shownNumber: number }) => {
  const t = useTranslations('group');
  const format = useFormatter();

  if (group.editions.length < 2) return null;
  return (
    <DisclosureCard title={t('editions.title')} icon={History} tone="mint">
      <ul className="flex flex-col divide-y-2 divide-ink/10">
        {group.editions.map((edition, index) => (
          <li key={edition.number} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1">
            <Link
              href={index === 0 ? `/g/${group.slug}` : `/g/${group.slug}/${edition.number}`}
              aria-current={edition.number === shownNumber ? 'page' : undefined}
              className="inline-flex min-h-11 items-center font-semibold aria-[current=page]:text-ink aria-[current=page]:no-underline"
            >
              {edition.title}
            </Link>
            <Badge variant={statusTone[edition.status]}>
              {edition.status === 'drawn' && !drawsNames(edition) ? t('status.locked') : t(`status.${edition.status}`)}
            </Badge>
            {index === 0 && <Badge variant="mint">{t('editions.current')}</Badge>}
            {edition.champions.length > 0 && (
              <span className="flex items-center gap-1 text-sm">
                <Trophy aria-hidden="true" className="size-4" />
                {t('editions.champions', { count: edition.champions.length, names: format.list(edition.champions) })}
              </span>
            )}
          </li>
        ))}
      </ul>
    </DisclosureCard>
  );
};
