import { Tabs, TabsContent } from '@/components/ui/tabs';
import { GroupWishlist } from '@/components/wishlist/group-wishlist';
import { useTRPC } from '@/lib/client/trpc';
import { useQuery } from '@tanstack/react-query';
import { useRef } from 'react';
import { isBeforeDraw } from '@/lib/schema/edition';
import { editionPhase } from './edition-phase';
import type { GroupData } from './group-data';
import { GifteePanel } from './giftee-panel';
import { GroupHeader } from './group-header';
import { GroupTabBar } from './group-tab-bar';
import { OverviewPanel } from './overview-panel';
import { PastEditionNotice } from './past-edition-notice';
import { PeoplePanel } from './people-panel';
import { PhaseStepper } from './phase-stepper';
import { groupTabs, useGroupTab, type GroupTab } from './use-group-tab';

/**
 * The group home once loaded (61): header, phase stepper, and tabs with my wishes here and who's in as
 * counts (79); "My giftee" only from the draw on.
 */
export const GroupView = ({ group }: { group: GroupData }) => {
  const { edition } = group;
  const tabs: readonly GroupTab[] = edition && !isBeforeDraw(edition) ? groupTabs : groupTabs.filter((tab) => tab !== 'giftee');
  const top = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useGroupTab(tabs, top);
  const trpc = useTRPC();
  const wishes = useQuery(trpc.wish.groupView.queryOptions({ groupSlug: group.slug }));
  const people = edition
    ? group.members.filter((m) => edition.participantIds.includes(m.id))
    : group.members.filter((m) => m.status === 'joined');
  // From a button inside a panel: that panel unmounts, so focus moves to the newly active tab.
  const showTab = (next: GroupTab) => {
    setTab(next);
    requestAnimationFrame(() => document.getElementById(`group-tab-${next}`)?.focus());
  };

  return (
    <Tabs value={tab} onValueChange={(value) => setTab(value as GroupTab)} className="flex flex-col gap-6">
      <div ref={top} className="flex scroll-mt-4 flex-col gap-6">
        <GroupHeader group={group} />
        {edition && !edition.isCurrent && <PastEditionNotice slug={group.slug} title={edition.title} />}
        {edition && <PhaseStepper phase={editionPhase(edition)} />}
      </div>
      <GroupTabBar tabs={tabs} counts={{ wishlist: wishes.data?.filter((wish) => wish.shown).length, people: people.length }} />
      <TabsContent value="overview" className="mt-0">
        <OverviewPanel group={group} showTab={showTab} />
      </TabsContent>
      {edition && tabs.includes('giftee') && (
        <TabsContent value="giftee" className="mt-0">
          <GifteePanel groupSlug={group.slug} edition={edition} />
        </TabsContent>
      )}
      <TabsContent value="wishlist" className="mt-0">
        <GroupWishlist groupSlug={group.slug} />
      </TabsContent>
      <TabsContent value="people" className="mt-0">
        <PeoplePanel group={group} />
      </TabsContent>
    </Tabs>
  );
};
