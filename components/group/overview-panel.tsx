import { ForYouSection } from '@/components/between/for-you-section';
import { LeaveTipLink } from '@/components/between/new-tip-dialog';
import { AddToCalendar } from '@/components/calendar/add-to-calendar';
import { NextEditionCard } from '@/components/draw/next-edition-card';
import { GiftArrivalCard } from '@/components/gift/gift-arrival-card';
import { EmptyWishlistsRow, StillShoppingRows } from '@/components/gift/still-shopping-stat';
import { Card, CardContent } from '@/components/ui/card';
import { GuessCard } from '@/components/guess/guess-card';
import { drawsNames, isBeforeDraw, isDrawn, isPosted, wishesOn } from '@/lib/schema/edition';
import { AddressCard, MissingAddressesRow } from './address-card';
import { EditionDetails } from './edition-details';
import { EditionsList } from './editions-list';
import type { GroupData } from './group-data';
import { PendingRequests } from './pending-requests';
import { PhaseMainCard } from './phase-main-card';
import type { GroupTab } from './use-group-tab';

/**
 * The overview tab (61): notices only when there are any, the phase's main card, gift day and past
 * editions; by post, your address (80) and whether your gift is on its way (87). Wide: a side column with gift day
 * and its details, then, for organizers, who's still shopping (63), has an empty wishlist, hasn't posted or has no address; phones:
 * that column after the rest.
 */
export const OverviewPanel = ({ group, showTab }: { group: GroupData; showTab: (tab: GroupTab) => void }) => {
  const { edition, slug } = group;
  const current = !edition || edition.isCurrent;
  const manage = Boolean(group.organizer) && current;
  const input = edition && { groupSlug: slug, editionNumber: edition.number };
  const done = edition?.status === 'done';
  const nextEdition = manage && edition && !isBeforeDraw(edition) && <NextEditionCard group={group} edition={edition} />;
  const posted = edition && isPosted(edition);
  const addresses = posted && (edition.status === 'open' || edition.status === 'drawn');
  const participates = edition?.participantIds.includes(group.me.memberId);
  const shopping = manage && edition?.status === 'drawn' && drawsNames(edition);
  const missingAddresses = manage && input && addresses;
  const emptyWishlists = manage && input && wishesOn(edition) && (edition.status === 'open' || edition.status === 'drawn');

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
      <div className="flex min-w-0 flex-col gap-6">
        {manage && <PendingRequests group={group} />}
        {input && <ForYouSection input={input} />}
        {edition && <PhaseMainCard group={group} edition={edition} manage={manage} showTab={showTab} />}
        {addresses && participates && <AddressCard groupSlug={slug} />}
        {input && posted && isDrawn(edition) && participates && <GiftArrivalCard {...input} />}
        {edition?.guessing && !isBeforeDraw(edition) && !done && <GuessCard group={group} edition={edition} />}
        {nextEdition}
        {edition && <EditionsList group={group} shownNumber={edition.number} />}
      </div>
      {edition && (
        <div className="flex min-w-0 flex-col gap-4">
          <EditionDetails edition={edition}>
            {current && <AddToCalendar groupSlug={slug} groupName={group.name} edition={edition} />}
          </EditionDetails>
          {input && current && participates && drawsNames(edition) && <LeaveTipLink input={input} className="px-2" />}
          {(shopping || missingAddresses || emptyWishlists) && (
            <Card size="sm">
              <CardContent>
                <ul className="flex flex-col gap-4">
                  {shopping && <StillShoppingRows groupSlug={slug} editionNumber={edition.number} />}
                  {emptyWishlists && <EmptyWishlistsRow {...input} />}
                  {missingAddresses && <MissingAddressesRow {...input} />}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
