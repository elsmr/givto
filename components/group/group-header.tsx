import { DrawNamesButton } from '@/components/draw/draw-names-button';
import { ManageMenu } from '@/components/manage/manage-menu';
import { buttonVariants } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { GroupData } from './group-data';

/** Group name and edition; for the organizer Draw names (while open) and Settings (61); ⋯ for everyone (64, 70). Budget and exchange are in the details. */
export const GroupHeader = ({ group }: { group: GroupData }) => {
  const t = useTranslations('group');
  const { edition } = group;

  return (
    <PageHeader
      title={group.name}
      actions={
        <>
          {group.me.isOrganizer && (
            <>
              {edition?.isCurrent && edition.status === 'open' && <DrawNamesButton group={group} edition={edition} />}
              <Link href={`/g/${group.slug}/settings`} className={buttonVariants({ variant: 'neutral' })}>
                <Settings aria-hidden="true" />
                <span className="max-sm:sr-only">{t('settings-link')}</span>
              </Link>
            </>
          )}
          <ManageMenu group={group} />
        </>
      }
    >
      {edition && <p className="font-semibold">{edition.title}</p>}
    </PageHeader>
  );
};
