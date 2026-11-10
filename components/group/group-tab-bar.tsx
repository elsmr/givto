import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gift, Heart, LayoutGrid, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { GroupTab } from './use-group-tab';

const icons = { overview: LayoutGrid, giftee: Gift, wishlist: Heart, people: Users };

/**
 * The group home's tabs (61). Phones: a bar stuck to the bottom of the screen (last in the page's
 * flex order, so it stays above the footer at the end), the active tab a filled pill. Wider: a row under the stepper.
 */
export const GroupTabBar = ({ tabs }: { tabs: readonly GroupTab[] }) => {
  const t = useTranslations('group.tabs');

  return (
    <TabsList
      aria-label={t('label')}
      className="sticky bottom-0 z-30 order-last -mx-4 h-auto w-auto justify-stretch gap-1 p-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] max-sm:border-x-0 max-sm:border-b-0 sm:static sm:order-none sm:mx-0 sm:w-full sm:p-1 sm:shadow-md"
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
            {t(tab)}
          </TabsTrigger>
        );
      })}
    </TabsList>
  );
};
