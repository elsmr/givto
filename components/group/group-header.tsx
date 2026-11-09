import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { GroupData } from './group-data';

const statusVariant = { draft: 'default', open: 'mint', drawn: 'primary-muted', giftday: 'yellow', done: 'default' } as const;

export const GroupHeader = ({ group }: { group: GroupData }) => {
  const t = useTranslations('group');

  return (
    <div className="flex flex-col gap-2">
      {group.edition && (
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-muted">{group.edition.title}</p>
          <Badge variant={statusVariant[group.edition.status]}>{t(`status.${group.edition.status}`)}</Badge>
        </div>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="min-w-0 text-4xl font-extrabold break-words sm:text-5xl">{group.name}</h1>
        {group.me.isOrganizer && (
          <Button variant="neutral" nativeButton={false} render={<Link href={`/g/${group.slug}/settings`} />}>
            <Settings aria-hidden="true" />
            {t('settings-link')}
          </Button>
        )}
      </div>
    </div>
  );
};
