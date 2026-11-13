import { Badge, badgeVariants } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel } from '@/components/ui/field';
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger, withTooltip } from '@/components/ui/tooltip';
import { useTRPC, type RouterOutputs } from '@/lib/client/trpc';
import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useId } from 'react';

type AccountGroup = RouterOutputs['account']['groups'][number];

/** Not archived and not done: its Santas may still buy a wish it shows. */
export const isActiveGroup = (group: AccountGroup) => !group.archived && group.edition?.status !== 'done';

/** For a wish more than one active group shows, as two Santas might buy it: "Also in Family" (also-in) or "Shown in Family and Work." (shown-in). */
export const AlsoInNote = ({ groups, kind = 'also-in' }: { groups: string[]; kind?: 'also-in' | 'shown-in' }) => {
  const t = useTranslations('wishlist.form');
  const format = useFormatter();
  return <p className="w-full text-sm">{t.rich(kind, { groups: format.list(groups), b: (chunks) => <b>{chunks}</b> })}</p>;
};

/** Groups a wish can be shown in: active ones first, archived ones left out. */
const useGroupChoices = () => {
  const groups = useQuery(useTRPC().account.groups.queryOptions());
  return (groups.data ?? [])
    .filter((group) => !group.archived)
    .toSorted((a, b) => Number(isActiveGroup(b)) - Number(isActiveGroup(a)));
};

/** The groups that show a wish as chips: the first two, then "+N" with the rest in a tooltip. `flagNone`: say so when none do. */
export const WishGroupChips = ({ shownIn, flagNone }: { shownIn: string[]; flagNone?: boolean }) => {
  const t = useTranslations('wishlist.form');
  const format = useFormatter();
  const choices = useGroupChoices();
  if (choices.length === 0) return null;
  const shown = choices.filter((group) => shownIn.includes(group.slug));
  const more = shown.slice(2).map(({ name }) => name);

  return (
    <>
      {flagNone && shown.length === 0 && <Badge variant="coral">{t('in-no-group')}</Badge>}
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
  /** On a wish: an icon button named after it, beside edit and archive. The add form has no title yet: "Groups". */
  wishTitle?: string;
}

/** A button that opens the groups to tick for a wish. */
export const WishGroupsPicker = ({ shownIn, onChange, wishTitle }: WishGroupsPickerProps) => {
  const t = useTranslations('wishlist.form');
  const id = useId();
  const choices = useGroupChoices();
  if (choices.length === 0) return null;
  const activeShown = choices.filter((group) => isActiveGroup(group) && shownIn.includes(group.slug)).map(({ name }) => name);

  return (
    <Popover>
      {wishTitle ? (
        withTooltip(
          t('groups-label', { title: wishTitle }),
          <PopoverTrigger render={<Button type="button" variant="neutral" size="icon-sm" />}>
            <Users aria-hidden="true" />
          </PopoverTrigger>
        )
      ) : (
        <PopoverTrigger render={<Button type="button" variant="neutral" size="sm" />}>
          <Users aria-hidden="true" />
          {t('groups')}
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
        {activeShown.length > 1 && <AlsoInNote kind="shown-in" groups={activeShown} />}
      </PopoverContent>
    </Popover>
  );
};

/** The add form: chips for the groups that will show the wish, and "Groups" to tick them. */
export const WishGroups = ({ shownIn, onChange }: Omit<WishGroupsPickerProps, 'wishTitle'>) => (
  <div className="flex flex-wrap items-center gap-1.5">
    <WishGroupChips shownIn={shownIn} />
    <WishGroupsPicker shownIn={shownIn} onChange={onChange} />
  </div>
);
