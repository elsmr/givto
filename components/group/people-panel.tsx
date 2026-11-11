import { TipsAboutPeople } from '@/components/between/tips-about-people';
import { drawsNames } from '@/lib/schema/edition';
import type { GroupData } from './group-data';
import { LeaveGroup } from './leave-group';
import { PeopleList } from './people-list';

/** The "People" tab (61): who's in, tips for someone's Santa (when there's a draw), and leaving. */
export const PeoplePanel = ({ group }: { group: GroupData }) => {
  const { edition } = group;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
      <PeopleList group={group} />
      <div className="flex min-w-0 flex-col gap-6">
        {edition && drawsNames(edition) && <TipsAboutPeople input={{ groupSlug: group.slug, editionNumber: edition.number }} />}
        {!group.me.isOrganizer && <LeaveGroup slug={group.slug} groupName={group.name} />}
      </div>
    </div>
  );
};
