import { Badge } from '@/components/ui/badge';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gift, Heart, LayoutGrid, StickyNote, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { GroupTab } from './use-group-tab';

const icons = { overview: LayoutGrid, giftee: Gift, boards: StickyNote, wishlist: Heart, people: Users };

/**
 * The group home's tabs (61), a segmented control under the stepper; the app nav owns the bottom of the screen.
 * `counts`: a small badge after the label, e.g. my wishes in this group (79); none for 0. `done`: the wishlist tab
 * holds everyone's lists (100).
 */
export const GroupTabBar = ({ tabs, counts = {}, done = false }: { tabs: readonly GroupTab[]; counts?: Partial<Record<GroupTab, number>>; done?: boolean }) => {
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
            {/* Phones: the count sits on the icon (CSS content, so the tab's text stays "Wishlist 1"), keeping the label on one line. */}
            <span
              data-count={counts[tab] || undefined}
              className="relative max-sm:data-count:after:absolute max-sm:data-count:after:-top-1.5 max-sm:data-count:after:left-full max-sm:data-count:after:-ml-0.5 max-sm:data-count:after:border-2 max-sm:data-count:after:border-outline max-sm:data-count:after:bg-surface max-sm:data-count:after:px-1 max-sm:data-count:after:font-mono max-sm:data-count:after:text-[0.625rem] max-sm:data-count:after:leading-tight max-sm:data-count:after:text-ink max-sm:data-count:after:content-[attr(data-count)]"
            >
              <Icon aria-hidden="true" />
            </span>
            <span>
              {t(done && tab === 'wishlist' ? 'wishlists' : tab)}
              {Boolean(counts[tab]) && (
                <>
                  {' '}
                  <Badge className="align-middle max-sm:sr-only">{counts[tab]}</Badge>
                </>
              )}
            </span>
          </TabsTrigger>
        );
      })}
    </TabsList>
  );
};
