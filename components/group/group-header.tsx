import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';
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
      <h1 className="text-4xl font-extrabold break-words sm:text-5xl">{group.name}</h1>
    </div>
  );
};
