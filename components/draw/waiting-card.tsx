import { AvatarStack } from '@/components/group/avatar-stack';
import type { GroupData, GroupEdition } from '@/components/group/group-data';
import type { GroupTab } from '@/components/group/use-group-tab';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { IconCardTitle } from '@/components/ui/icon-card-title';
import { IconTile } from '@/components/ui/icon-tile';
import { useTRPC } from '@/lib/client/trpc';
import { useQuery } from '@tanstack/react-query';
import { Check, Heart, PartyPopper } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';

/**
 * Open edition, for a member who's in (79): all set once this group shows a wish of theirs, else adding
 * wishes is the one to-do. Then nothing until the organizer draws names; the draw email tells them.
 */
export const WaitingCard = ({ group, edition, showTab }: { group: GroupData; edition: GroupEdition; showTab: (tab: GroupTab) => void }) => {
  const t = useTranslations('draw');
  const tGroup = useTranslations('group');
  const format = useFormatter();
  const trpc = useTRPC();
  const wishes = useQuery(trpc.wish.groupView.queryOptions({ groupSlug: group.slug }));
  if (wishes.isPending) return null;

  const wishCount = wishes.data?.filter((wish) => wish.shown).length ?? 0;
  const ready = wishCount > 0;
  const people = group.members.filter((m) => edition.participantIds.includes(m.id));
  const organizer = group.members.find((m) => m.role === 'organizer')?.name.split(' ')[0] ?? tGroup('people.organizer');
  const waiting = (
    <p>
      {edition.drawAt
        ? t('waiting.wait-on', { organizer, date: format.dateTime(edition.drawAt, { dateStyle: 'full', timeZone: edition.timeZone }) })
        : t('waiting.wait', { organizer })}{' '}
      {t('waiting.email')}
    </p>
  );
  const done = <IconTile icon={Check} tone="mint" className="size-7" />;

  return (
    <Card>
      <CardHeader>
        <IconCardTitle icon={ready ? PartyPopper : Heart} tone={ready ? 'mint' : 'coral'}>
          {ready ? t('waiting.ready') : t('waiting.todo')}
        </IconCardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {ready && waiting}
        <ul className="flex flex-col gap-2 font-semibold">
          <li className="flex items-center gap-3">
            {done}
            {t('waiting.in')}
          </li>
          <li className="flex flex-wrap items-center gap-3">
            {ready ? done : <span aria-hidden="true" className="size-7 shrink-0 border-2 border-outline bg-surface" />}
            {ready ? t('waiting.wishes', { count: wishCount }) : t('waiting.no-wishes')}
            {!ready && <Button onClick={() => showTab('wishlist')}>{t('waiting.add')}</Button>}
          </li>
        </ul>
        {!ready && waiting}
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
