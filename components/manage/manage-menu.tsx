import type { GroupData, GroupEdition } from '@/components/group/group-data';
import { useGiftDay } from '@/components/giftday/use-gift-day';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Flag, Gift, Repeat, RotateCcw, ShoppingBag, SlidersHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { HatchDialog } from './hatch-dialog';
import { hatchesFor, type Hatch } from './hatches';
import { NewEditionDialog } from './new-edition-dialog';

const icons = { startGiftDay: Gift, finishGiftDay: Flag, backToShopping: ShoppingBag, reopenGiftDay: RotateCcw };

/**
 * The organizer's ways around dates (64), compact next to Settings: start gift day now, finish it,
 * back to shopping, reopen; and a new edition (77). Each asks first. Nothing here before the draw.
 * The group's latest edition only.
 */
export const ManageMenu = ({ group, edition }: { group: GroupData; edition: GroupEdition }) => {
  const t = useTranslations('manage');
  const [hatch, setHatch] = useState<Hatch | null>(null);
  const [newEdition, setNewEdition] = useState(false);
  const giftDay = useGiftDay({ groupSlug: group.slug, editionNumber: edition.number }, edition.status);
  const hatches = hatchesFor(edition.status);
  if (hatches.length === 0) return null;
  // A Santa shown at a turn (62) counts too: what people saw can't be unseen.
  const underway = Boolean(giftDay.data?.unwrapOrder?.went.length || giftDay.data?.reveal.revealed || giftDay.data?.guessing?.results.length);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="neutral" />}>
          <SlidersHorizontal aria-hidden="true" />
          {t('button')}
          <ChevronDown aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          {hatches.map((item) => {
            const Icon = icons[item];
            const blocked = item === 'backToShopping' && underway;
            return (
              <DropdownMenuItem key={item} disabled={blocked} onClick={() => setHatch(item)}>
                <Icon aria-hidden="true" />
                <span className="flex flex-col">
                  {t(`${item}.item`)}
                  {blocked && <span className="text-sm">{t('backToShopping.underway')}</span>}
                </span>
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setNewEdition(true)}>
            <Repeat aria-hidden="true" />
            {t('newEdition.item')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {hatch && (
        <HatchDialog
          hatch={hatch}
          groupSlug={group.slug}
          edition={edition}
          shuffled={Boolean(giftDay.data?.unwrapOrder)}
          onClose={() => setHatch(null)}
        />
      )}
      {newEdition && <NewEditionDialog group={group} edition={edition} onClose={() => setNewEdition(false)} />}
    </>
  );
};
