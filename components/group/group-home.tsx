import { ForYouSection } from '@/components/between/for-you-section';
import { SantaSection } from '@/components/between/santa-section';
import { TipsAboutPeople } from '@/components/between/tips-about-people';
import { AddToCalendar } from '@/components/calendar/add-to-calendar';
import { NextEditionCard } from '@/components/draw/next-edition-card';
import { GiftDayHero } from '@/components/giftday/gift-day-hero';
import { GiftDaySection } from '@/components/giftday/gift-day-section';
import { GifteeWishlist } from '@/components/wishlist/giftee-wishlist';
import { GroupWishlist } from '@/components/wishlist/group-wishlist';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LogoAnimation } from '@/components/logo-animation/logo-animation';
import { useTRPC } from '@/lib/client/trpc';
import { MIN_PARTICIPANTS } from '@/lib/schema/group';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { appErrorCode } from './app-error-code';
import { DrawSlot } from './draw-slot';
import { EditionSummary } from './edition-summary';
import { EditionsList } from './editions-list';
import { GroupHeader } from './group-header';
import { GroupNotFound } from './group-not-found';
import { KeepApartSection } from './keep-apart-section';
import { LeaveGroup } from './leave-group';
import { PendingRequests } from './pending-requests';
import { PastEditionNotice } from './past-edition-notice';
import { PeopleList } from './people-list';
import { ShareSection } from './share-section';
import { useRequireSession } from './use-require-session';

const beforeDraw = new Set(['draft', 'open']);

/**
 * /g/[slug]: one page with sections for the current edition (24); /g/[slug]/[edition] shows
 * an earlier one with the same sections, read-only for the organizer tools. Members only. Pages
 * using this load the `group`, `wishlist`, `between`, `draw` and `giftday` messages.
 */
export const GroupHome = ({ slug, editionNumber }: { slug: string; editionNumber?: number }) => {
  const t = useTranslations('group');
  const trpc = useTRPC();
  const user = useRequireSession();
  const group = useQuery({ ...trpc.group.get.queryOptions({ groupSlug: slug, editionNumber }), enabled: !!user });

  if (!user || group.isPending) return <LogoAnimation variant="loading" />;
  if (group.error) {
    const code = appErrorCode(group.error);
    if (code === 'GROUP_NOT_FOUND') return <GroupNotFound />;
    if (code === 'EDITION_NOT_FOUND') return <PastEditionNotice slug={slug} />;
    return (
      <Alert variant="danger">
        <AlertDescription>{t('load-failed')}</AlertDescription>
      </Alert>
    );
  }

  const { data } = group;
  const { edition, organizer } = data;
  const open = edition && beforeDraw.has(edition.status);
  const current = !edition || edition.isCurrent;
  const manage = organizer && current;
  const input = edition && { groupSlug: slug, editionNumber: edition.number };
  return (
    <div className="flex flex-col gap-8">
      <GroupHeader group={data} />
      {edition && !current && <PastEditionNotice slug={slug} title={edition.title} />}
      {manage && <PendingRequests group={data} />}
      {edition?.status === 'giftday' && <GiftDayHero groupSlug={slug} canPresent={Boolean(manage)} />}
      {input && <ForYouSection input={input} />}
      {/* This Secret Santa on the left, me and everyone on the right; one column on phones (13). */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-8">
          {edition && (
            <EditionSummary edition={edition}>
              {current && <AddToCalendar groupSlug={slug} groupName={data.name} edition={edition} />}
            </EditionSummary>
          )}
          {edition && <DrawSlot group={data} edition={edition} />}
          {manage && open && (
            <ShareSection group={data} primary={edition.status === 'open' && edition.participantIds.length < MIN_PARTICIPANTS} />
          )}
          {manage && edition && open && <KeepApartSection group={data} edition={edition} organizer={organizer} />}
          {edition && <GiftDaySection group={data} edition={edition} />}
          {input && <GifteeWishlist {...input} />}
          {input && <SantaSection input={input} />}
        </div>
        <div className="flex min-w-0 flex-col gap-8">
          {edition && <GroupWishlist groupSlug={slug} />}
          {input && <TipsAboutPeople input={input} />}
          <PeopleList group={data} />
          {manage && edition && !open && <NextEditionCard groupSlug={slug} edition={edition} />}
          {edition && <EditionsList group={data} shownNumber={edition.number} />}
          {!data.me.isOrganizer && <LeaveGroup slug={slug} groupName={data.name} />}
        </div>
      </div>
    </div>
  );
};
