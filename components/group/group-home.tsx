import { LoadFailed } from '@/components/shell/load-failed';
import { Skeleton } from '@/components/ui/skeleton';
import { useTRPC } from '@/lib/client/trpc';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { appErrorCode } from './app-error-code';
import { GroupNotFound } from './group-not-found';
import { GroupView } from './group-view';
import { PastEditionNotice } from './past-edition-notice';
import { useRequireSession } from '@/components/auth/use-require-session';

/**
 * /g/[slug]: the current edition, shaped by its phase (61); /g/[slug]/[edition] shows an earlier one
 * the same way, read-only for the organizer tools. Members only. Pages using this load the `group`,
 * `wishlist`, `between`, `draw` and `giftday` messages.
 */
export const GroupHome = ({ slug, editionNumber }: { slug: string; editionNumber?: number }) => {
  const t = useTranslations('group');
  const trpc = useTRPC();
  const user = useRequireSession();
  const group = useQuery(trpc.group.get.queryOptions({ groupSlug: slug, editionNumber }));

  if (!user || group.isPending) {
    return (
      <div data-page-loading className="flex flex-col gap-8">
        <Skeleton className="h-20" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (group.error) {
    const code = appErrorCode(group.error);
    if (code === 'GROUP_NOT_FOUND') return <GroupNotFound />;
    if (code === 'EDITION_NOT_FOUND') return <PastEditionNotice slug={slug} />;
    return <LoadFailed message={t('load-failed')} onRetry={() => void group.refetch()} />;
  }
  return <GroupView group={group.data} />;
};
