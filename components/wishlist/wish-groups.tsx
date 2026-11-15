import { Badge, badgeVariants } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel } from '@/components/ui/field';
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger, withTooltip } from '@/components/ui/tooltip';
import { useTRPC, type RouterOutputs } from '@/lib/client/trpc';
import { wishesOn } from '@/lib/schema/edition';
import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useId } from 'react';

type AccountGroup = RouterOutputs['account']['groups'][number];

/** Not archived, not done and with wishes (not a white elephant): its Santas may still buy a wish it shows. */
export const isActiveGroup = (group: AccountGroup) =>
  !group.archived && (!group.edition || (group.edition.status !== 'done' && wishesOn(group.edition)));

/** For a wish more than one active group shows: "Also in Family" (also-in) or "Shown in Family and Work." (shown-in). */
export const AlsoInNote = ({ groups, kind = 'also-in' }: { groups: string[]; kind?: 'also-in' | 'shown-in' }) => {
  const t = useTranslations('wishlist.form');
  const format = useFormatter();
  return <p className="w-full text-sm">{t(kind, { groups: format.list(groups) })}</p>;
};

/** Groups a wish can be shown in: only active ones, as nobody buys from a past edition's list. */
const useGroupChoices = () => {
  const groups = useQuery(useTRPC().account.groups.queryOptions());
  return (groups.data ?? []).filter(isActiveGroup);
};

/** The groups that show a wish as chips: the first two, then "+N" with the rest in a tooltip. */
export const WishGroupChips = ({ shownIn }: { shownIn: string[] }) => {
  const t = useTranslations('wishlist.form');
  const format = useFormatter();
  const choices = useGroupChoices();
  if (choices.length === 0) return null;
  const shown = choices.filter((group) => shownIn.includes(group.slug));
  const more = shown.slice(2).map(({ name }) => name);

  return (
    <>
      {shown.slice(0, 2).map((group) => (
        <Badge key={group.slug} className="max-w-48">
          <span className="truncate">{group.name}</span>
        </Badge>
      ))}
      {more.length > 0 && (
        <Tooltip>
          <TooltipTrigger type="button" aria-label={format.list(more)} className={badgeVariants()}>
            {t('groups-more', { count: more.length })}
          </TooltipTrigger>
          <TooltipContent>{format.list(more)}</TooltipContent>
        </Tooltip>
      )}
    </>
  );
};

interface WishGroupsPickerProps {
  /** Slugs of the groups that show the wish. */
  shownIn: string[];
  onChange: (groupSlug: string, shown: boolean) => void;
  /** On a wish: named after it, beside edit and archive. The add form has no title yet: "Groups", with a count of the ticked ones. */
  wishTitle?: string;
}

/** A button that opens the groups to tick for a wish. */
export const WishGroupsPicker = ({ shownIn, onChange, wishTitle }: WishGroupsPickerProps) => {
  const t = useTranslations('wishlist.form');
  const id = useId();
  const choices = useGroupChoices();
  if (choices.length === 0) return null;
  const shown = choices.filter((group) => shownIn.includes(group.slug)).map(({ name }) => name);

  return (
    <Popover>
      {withTooltip(
        wishTitle ? t('groups-label', { title: wishTitle }) : t('groups', { count: shown.length }),
        <PopoverTrigger render={<Button type="button" variant="neutral" size="icon-sm" className="relative" />}>
          <Users aria-hidden="true" />
          {!wishTitle && shown.length > 0 && (
            <Badge variant="yellow" aria-hidden="true" className="absolute -top-2 -right-2 px-1">
              {shown.length}
            </Badge>
          )}
        </PopoverTrigger>
      )}
      <PopoverContent align={wishTitle ? 'end' : 'start'}>
        <PopoverHeader>
          <PopoverTitle>{t('show-in')}</PopoverTitle>
        </PopoverHeader>
        <ul className="-m-1 flex max-h-72 flex-col gap-3 overflow-y-auto p-1">
          {choices.map((group) => (
            <li key={group.slug}>
              <Field orientation="horizontal">
                <Checkbox
                  id={`${id}-${group.slug}`}
                  checked={shownIn.includes(group.slug)}
                  onCheckedChange={(checked) => onChange(group.slug, checked)}
                />
                <FieldLabel htmlFor={`${id}-${group.slug}`} className="font-normal break-words">
                  {group.name}
                </FieldLabel>
              </Field>
            </li>
          ))}
        </ul>
        {shown.length > 1 && <AlsoInNote kind="shown-in" groups={shown} />}
      </PopoverContent>
    </Popover>
  );
};

