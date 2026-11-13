import { ADDRESS_FIELD_ID } from '@/components/account/address-book';
import { AvatarStack } from '@/components/group/avatar-stack';
import type { GroupData, GroupEdition } from '@/components/group/group-data';
import type { GroupTab } from '@/components/group/use-group-tab';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { IconCardTitle } from '@/components/ui/icon-card-title';
import { IconTile } from '@/components/ui/icon-tile';
import { useTRPC } from '@/lib/client/trpc';
import { drawsNames, wishesOn } from '@/lib/schema/edition';
import { useQuery } from '@tanstack/react-query';
import { Check, Heart, PartyPopper } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';

/**
 * Open edition, for a member who's in (79): all set once this group shows a wish of theirs and, when gifts
 * go by post, their address is in (80). Then nothing until the organizer draws names; the draw email tells them.
 * In a white elephant (88) you're all set once you're in: nobody sees your wishes, and locking in sends nothing.
 * A conspiracy (90) has no draw either, but the others see your wishes on your board.
 */
export const WaitingCard = ({ group, edition, showTab }: { group: GroupData; edition: GroupEdition; showTab: (tab: GroupTab) => void }) => {
  const t = useTranslations('draw');
  const tGroup = useTranslations('group');
  const format = useFormatter();
  const trpc = useTRPC();
  const posted = edition.exchangeMode !== 'inPerson';
  const draws = drawsNames(edition);
  const wishesNeeded = wishesOn(edition);
  const wishes = useQuery({ ...trpc.wish.groupView.queryOptions({ groupSlug: group.slug }), enabled: wishesNeeded });
  const address = useQuery({ ...trpc.address.mine.queryOptions({ groupSlug: group.slug }), enabled: posted });
  if ((wishesNeeded && wishes.isPending) || (posted && address.isPending)) return null;

  const wishCount = wishes.data?.filter((wish) => wish.shown).length ?? 0;
  const wishesDone = !wishesNeeded || wishCount > 0;
  const hasAddress = !posted || Boolean(address.data);
  const ready = wishesDone && hasAddress;
  const people = group.members.filter((m) => edition.participantIds.includes(m.id));
  const organizer = group.members.find((m) => m.role === 'organizer')?.name.split(' ')[0] ?? tGroup('people.organizer');
  const waiting = !draws
    ? edition.kind === 'conspiracy'
      ? t('lock-in.wait-conspiracy', { organizer })
      : t('lock-in.wait', { organizer })
    : edition.drawAt
      ? t('waiting.wait-on', { organizer, date: format.dateTime(edition.drawAt, { dateStyle: 'full', timeZone: edition.timeZone }) })
      : t('waiting.wait', { organizer });
  const done = <IconTile icon={Check} tone="mint" className="size-7" />;
  const todo = <span aria-hidden="true" className="size-7 shrink-0 border-2 border-outline bg-surface" />;

  return (
    <Card>
      <CardHeader>
        <IconCardTitle icon={ready ? PartyPopper : Heart} tone={ready ? 'mint' : 'coral'}>
          {ready ? t('waiting.ready') : t('waiting.in')}
        </IconCardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {ready && <p>{waiting}</p>}
        {(wishesNeeded || posted) && (
          <ul className="flex flex-col gap-2 font-semibold">
            {wishesNeeded && (
              <li className="flex flex-wrap items-center gap-3">
                {wishesDone ? done : todo}
                {wishesDone ? t('waiting.wishes', { count: wishCount }) : <Button onClick={() => showTab('wishlist')}>{t('waiting.add')}</Button>}
              </li>
            )}
            {posted && (
              <li className="flex flex-wrap items-center gap-3">
                {hasAddress ? done : todo}
                {hasAddress ? t('waiting.address') : <Button onClick={() => document.getElementById(ADDRESS_FIELD_ID)?.focus()}>{t('waiting.add-address')}</Button>}
              </li>
            )}
          </ul>
        )}
        {people.length > 0 && (
          <AvatarStack
            people={people}
            label={t('before.who-names', { count: people.length, names: format.list(people.map((person) => person.name)) })}
          />
        )}
      </CardContent>
    </Card>
  );
};
