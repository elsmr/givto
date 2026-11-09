import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader } from '@/components/ui/loader';
import { useTRPC } from '@/lib/client/trpc';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { appErrorCode } from './app-error-code';
import { DrawSlot } from './draw-slot';
import { EditionSummary } from './edition-summary';
import { GroupHeader } from './group-header';
import { GroupNotFound } from './group-not-found';
import { KeepApartSection } from './keep-apart-section';
import { LeaveGroup } from './leave-group';
import { PendingRequests } from './pending-requests';
import { PeopleList } from './people-list';
import { ShareSection } from './share-section';
import { useRequireSession } from './use-require-session';
import { WishlistSlot } from './wishlist-slot';

const beforeDraw = new Set(['draft', 'open']);

/** /g/[slug]: one page with sections for the current edition (24). Members only. */
export const GroupHome = ({ slug }: { slug: string }) => {
  const t = useTranslations('group');
  const trpc = useTRPC();
  const user = useRequireSession();
  const group = useQuery({ ...trpc.group.get.queryOptions({ groupSlug: slug }), enabled: !!user });

  if (!user || group.isPending) return <Loader />;
  if (group.error) {
    if (appErrorCode(group.error) === 'GROUP_NOT_FOUND') return <GroupNotFound />;
    return (
      <Alert variant="danger">
        <AlertDescription>{t('load-failed')}</AlertDescription>
      </Alert>
    );
  }

  const { data } = group;
  const { edition, organizer } = data;
  const open = edition && beforeDraw.has(edition.status);
  return (
    <div className="flex flex-col gap-8">
      <GroupHeader group={data} />
      {organizer && <PendingRequests group={data} />}
      {edition && <EditionSummary edition={edition} />}
      {organizer && open && <ShareSection group={data} />}
      {edition && <DrawSlot groupSlug={slug} editionNumber={edition.number} />}
      {edition && <WishlistSlot groupSlug={slug} editionNumber={edition.number} />}
      <PeopleList group={data} />
      {organizer && edition && open && <KeepApartSection group={data} edition={edition} organizer={organizer} />}
      {!data.me.isOrganizer && <LeaveGroup slug={slug} groupName={data.name} />}
    </div>
  );
};
