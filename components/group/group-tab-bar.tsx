import { Badge } from '@/components/ui/badge';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gift, Heart, LayoutGrid, StickyNote, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { GroupTab } from './use-group-tab';

const icons = { overview: LayoutGrid, giftee: Gift, boards: StickyNote, wishlist: Heart, people: Users };

/**
 * The group home's tabs (61), a segmented control under the stepper; the app nav owns the bottom of the screen.
 * `counts`: a small badge after the label, e.g. my wishes in this group (79).
 */
export const GroupTabBar = ({ tabs, counts = {} }: { tabs: readonly GroupTab[]; counts?: Partial<Record<GroupTab, number>> }) => {
  const t = useTranslations('group.tabs');

  return (
    <TabsList
      aria-label={t('label')}
      variant="segmented"
      className="h-auto w-full justify-stretch"
    >
      {tabs.map((tab) => {
        const Icon = icons[tab];
        return (
          <TabsTrigger
            key={tab}
            value={tab}
            id={`group-tab-${tab}`}
            className="h-auto min-h-14 flex-1 basis-0 flex-col gap-0.5 px-1 py-1.5 text-xs leading-tight whitespace-normal sm:min-h-11 sm:flex-row sm:gap-2 sm:text-base [&_svg:not([class*='size-'])]:size-5"
          >
            <Icon aria-hidden="true" />
            <span>
              {t(tab)}
              {counts[tab] !== undefined && (
                <>
                  {' '}
                  <Badge className="align-middle">{counts[tab]}</Badge>
                </>
              )}
            </span>
          </TabsTrigger>
        );
      })}
    </TabsList>
  );
};
