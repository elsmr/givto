import type { GroupData } from '@/components/group/group-data';
import { useGiftDay } from '@/components/giftday/use-gift-day';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RedrawDialog } from '@/components/settings/redraw-section';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { drawsNames } from '@/lib/schema/edition';
import { Ellipsis, Flag, Gift, Repeat, RotateCcw, ShoppingBag, Shuffle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { HatchDialog } from './hatch-dialog';
import { hatchesFor, type Hatch } from './hatches';
import { NewEditionDialog } from './new-edition-dialog';

const icons = { startGiftDay: Gift, finishGiftDay: Flag, backToShopping: ShoppingBag, reopenGiftDay: RotateCcw };

/**
 * ⋯ next to the group's title, for the organizer: the ways around dates (64): start gift day now, finish it, back to
 * shopping, reopen; re-draw names while shopping (27); and a new edition (77). Each asks first. Only from the draw on, and for the group's latest edition.
 */
export const ManageMenu = ({ group }: { group: GroupData }) => {
  const t = useTranslations('manage');
  const tRedraw = useTranslations('draw.redraw');
  const [hatch, setHatch] = useState<Hatch | null>(null);
  const [redraw, setRedraw] = useState(false);
  const [newEdition, setNewEdition] = useState(false);
  const edition = group.me.isOrganizer && group.edition?.isCurrent ? group.edition : undefined;
  const hatches = edition ? hatchesFor(edition.status) : [];
  // Off for members: 'draft' is before the draw, when useGiftDay doesn't fetch.
  const giftDay = useGiftDay({ groupSlug: group.slug, editionNumber: edition?.number ?? 0 }, edition?.status ?? 'draft');
  // A Santa shown at a turn (62) counts too: what people saw can't be unseen.
  const underway = Boolean(giftDay.data?.unwrapOrder?.went.length || giftDay.data?.swap?.gifts.length || giftDay.data?.reveal.revealed || giftDay.data?.guessing?.results.length);

  if (!edition || hatches.length === 0) return null;
  const canRedraw = edition.status === 'drawn' && drawsNames(edition);
  return (
    <>
      <DropdownMenu>
        <Tooltip>
          <DropdownMenuTrigger render={<TooltipTrigger render={<Button variant="neutral" size="icon" aria-label={t('button')} />} />}>
            <Ellipsis aria-hidden="true" />
          </DropdownMenuTrigger>
          <TooltipContent>{t('button')}</TooltipContent>
        </Tooltip>
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
          {canRedraw && (
            <DropdownMenuItem onClick={() => setRedraw(true)}>
              <Shuffle aria-hidden="true" />
              {tRedraw('button')}
            </DropdownMenuItem>
          )}
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
      {redraw && <RedrawDialog group={group} edition={edition} onClose={() => setRedraw(false)} />}
      {newEdition && <NewEditionDialog group={group} edition={edition} onClose={() => setNewEdition(false)} />}
    </>
  );
};
