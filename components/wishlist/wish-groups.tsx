import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel } from '@/components/ui/field';
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/components/ui/popover';
import { useTRPC, type RouterOutputs } from '@/lib/client/trpc';
import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useId } from 'react';

type AccountGroup = RouterOutputs['account']['groups'][number];

/** Not archived and not done: its Santas may still buy a wish it shows. */
export const isActiveGroup = (group: AccountGroup) => !group.archived && group.edition?.status !== 'done';

/** "Also in Family." for a wish more than one active group shows: two Santas might buy it. */
export const AlsoInNote = ({ groups }: { groups: string[] }) => {
  const t = useTranslations('wishlist.form');
  const format = useFormatter();
  return (
    <p className="w-full text-sm">{t.rich('also-in', { groups: format.list(groups), b: (chunks) => <b>{chunks}</b> })}</p>
  );
};

interface WishGroupsProps {
  /** Slugs of the groups that show the wish. */
  shownIn: string[];
  onChange: (groupSlug: string, shown: boolean) => void;
  /** Names the "Groups" button after the wish; the add form has no title yet. */
  wishTitle?: string;
}

/** The groups that show a wish as chips (the first two, then "+N"), and "Groups" to tick them: active groups first, archived ones left out. */
export const WishGroups = ({ shownIn, onChange, wishTitle }: WishGroupsProps) => {
  const t = useTranslations('wishlist.form');
  const format = useFormatter();
  const id = useId();
  const groups = useQuery(useTRPC().account.groups.queryOptions());
  const choices = (groups.data ?? [])
    .filter((group) => !group.archived)
    .toSorted((a, b) => Number(isActiveGroup(b)) - Number(isActiveGroup(a)));
  if (choices.length === 0) return null;
  const shown = choices.filter((group) => shownIn.includes(group.slug));
  const more = shown.slice(2).map(({ name }) => name);
  const alsoIn = (group: AccountGroup) =>
    isActiveGroup(group) ? shown.filter((other) => other !== group && isActiveGroup(other)).map(({ name }) => name) : [];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {shown.slice(0, 2).map((group) => (
        <Badge key={group.slug} className="max-w-48">
          <span className="truncate">{group.name}</span>
        </Badge>
      ))}
      {more.length > 0 && <Badge title={format.list(more)}>{t('groups-more', { count: more.length })}</Badge>}
      <Popover>
        <PopoverTrigger
          render={
            <Button type="button" variant="neutral" size="sm" aria-label={wishTitle && t('groups-label', { title: wishTitle })} />
          }
        >
          <Users aria-hidden="true" />
          {t('groups')}
        </PopoverTrigger>
        <PopoverContent align="start">
          <PopoverHeader>
            <PopoverTitle>{t('show-in')}</PopoverTitle>
            <PopoverDescription>{t('show-in-hint')}</PopoverDescription>
          </PopoverHeader>
          <ul className="-m-1 flex max-h-72 flex-col gap-3 overflow-y-auto p-1">
            {choices.map((group) => {
              const others = shownIn.includes(group.slug) ? alsoIn(group) : [];
              return (
                <li key={group.slug} className="flex flex-col gap-1">
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
                  {others.length > 0 && <AlsoInNote groups={others} />}
                </li>
              );
            })}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
};
