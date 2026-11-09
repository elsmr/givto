import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { GroupData } from './group-data';

/** Every edition of the group, newest first (33). Only once there's history. */
export const EditionsList = ({ group, shownNumber }: { group: GroupData; shownNumber: number }) => {
  const t = useTranslations('group');

  if (group.editions.length < 2) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t('editions.title')}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col divide-y-2 divide-ink/10">
          {group.editions.map((edition, index) => (
            <li key={edition.number} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
              <Link
                href={index === 0 ? `/g/${group.slug}` : `/g/${group.slug}/${edition.number}`}
                aria-current={edition.number === shownNumber ? 'page' : undefined}
                className="font-semibold aria-[current=page]:text-ink aria-[current=page]:no-underline"
              >
                {edition.title}
              </Link>
              <Badge>{t(`status.${edition.status}`)}</Badge>
              {index === 0 && <Badge variant="mint">{t('editions.current')}</Badge>}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
