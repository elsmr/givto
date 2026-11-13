import { BoardsPanel } from '@/components/between/boards-panel';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { EditionWishlists } from '@/components/wishlist/edition-wishlists';
import { GroupWishlist } from '@/components/wishlist/group-wishlist';
import { useTRPC } from '@/lib/client/trpc';
import { useQuery } from '@tanstack/react-query';
import { useRef } from 'react';
import { drawsNames, isBeforeDraw, wishesOn } from '@/lib/schema/edition';
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
 * counts (79); "My giftee" only from the draw on, "Boards" instead in a conspiracy (90). A done edition shows
 * everyone's wishlists as they were when it ended (100), not my wishes now.
 */
export const GroupView = ({ group }: { group: GroupData }) => {
  const { edition } = group;
  // No giftee without a draw (88). Live wishes are the group's, hidden while its current edition is a white elephant.
  const noGiftee = !edition || isBeforeDraw(edition) || !drawsNames(edition);
  const done = edition?.status === 'done';
  const noWishes = done ? !wishesOn(edition) : group.editions[0]?.kind === 'whiteElephant';
  const hidden = (tab: GroupTab) =>
    (tab === 'giftee' && noGiftee) || (tab === 'boards' && !group.me.hasBoards) || (tab === 'wishlist' && noWishes);
  const tabs: readonly GroupTab[] = groupTabs.filter((tab) => !hidden(tab));
  const top = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useGroupTab(tabs, top);
  const trpc = useTRPC();
  const wishes = useQuery({ ...trpc.wish.groupView.queryOptions({ groupSlug: group.slug }), enabled: !done });
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
        {edition && <PhaseStepper phase={editionPhase(edition)} kind={edition.kind} />}
      </div>
      <GroupTabBar tabs={tabs} done={done} counts={{ wishlist: done ? undefined : wishes.data?.filter((wish) => wish.shown).length, people: people.length }} />
      <TabsContent value="overview" className="mt-0">
        <OverviewPanel group={group} showTab={showTab} />
      </TabsContent>
      {edition && tabs.includes('giftee') && (
        <TabsContent value="giftee" className="mt-0">
          <GifteePanel groupSlug={group.slug} edition={edition} />
        </TabsContent>
      )}
      {edition && tabs.includes('boards') && (
        <TabsContent value="boards" className="mt-0">
          <BoardsPanel input={{ groupSlug: group.slug, editionNumber: edition.number }} />
        </TabsContent>
      )}
      {tabs.includes('wishlist') && (
        <TabsContent value="wishlist" className="mt-0">
          {edition && done ? <EditionWishlists groupSlug={group.slug} editionNumber={edition.number} /> : <GroupWishlist groupSlug={group.slug} />}
        </TabsContent>
      )}
      <TabsContent value="people" className="mt-0">
        <PeoplePanel group={group} />
      </TabsContent>
    </Tabs>
  );
};
