import { ForYouSection } from '@/components/between/for-you-section';
import { AddToCalendar } from '@/components/calendar/add-to-calendar';
import { NextEditionCard } from '@/components/draw/next-edition-card';
import { GiftDayPanel } from '@/components/giftday/gift-day-panel';
import { GuessCard } from '@/components/guess/guess-card';
import { NotebookText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DisclosureCard } from '@/components/ui/disclosure-card';
import { isBeforeDraw } from '@/lib/schema/edition';
import { EditionDetails } from './edition-details';
import { EditionsList } from './editions-list';
import type { GroupData } from './group-data';
import { OverviewStats } from './overview-stats';
import { PendingRequests } from './pending-requests';
import { PhaseMainCard } from './phase-main-card';
import type { GroupTab } from './use-group-tab';

/**
 * The overview tab (61): notices only when there are any, the phase's main card, stats, and the
 * rest collapsed. Wide: main column and a stats column; phones: one column in that order.
 */
export const OverviewPanel = ({ group, showTab }: { group: GroupData; showTab: (tab: GroupTab) => void }) => {
  const t = useTranslations('group.overview');
  const { edition, slug } = group;
  const current = !edition || edition.isCurrent;
  const manage = Boolean(group.organizer) && current;
  const input = edition && { groupSlug: slug, editionNumber: edition.number };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
      <div className="flex min-w-0 flex-col gap-6">
        {manage && <PendingRequests group={group} />}
        {input && <ForYouSection input={input} />}
        {edition && <PhaseMainCard group={group} edition={edition} manage={manage} showTab={showTab} />}
        {edition?.guessing && !isBeforeDraw(edition) && <GuessCard group={group} edition={edition} />}
        {manage && edition && !isBeforeDraw(edition) && <NextEditionCard group={group} edition={edition} />}
      </div>
      <div className="min-w-0 lg:row-span-2">
        <OverviewStats group={group} showTab={showTab} />
      </div>
      <div className="flex min-w-0 flex-col gap-4 lg:col-start-1">
        {edition && <GiftDayPanel group={group} edition={edition} />}
        {edition && (
          <DisclosureCard title={t('details')} icon={NotebookText} tone="mint">
            <EditionDetails edition={edition}>
              {current && <AddToCalendar groupSlug={slug} groupName={group.name} edition={edition} />}
            </EditionDetails>
          </DisclosureCard>
        )}
        {edition && <EditionsList group={group} shownNumber={edition.number} />}
      </div>
    </div>
  );
};
