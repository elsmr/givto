import type { GroupData, GroupEdition } from '@/components/group/group-data';
import { useRefreshEdition } from '@/components/draw/use-refresh-edition';
import { InvitePeople } from '@/components/group/invite-people';
import { JoinLinkSettings } from '@/components/group/join-link-settings';
import { Card, CardContent, CardDescription, CardDivider, CardHeader } from '@/components/ui/card';
import { FieldError } from '@/components/ui/field';
import { IconCardTitle } from '@/components/ui/icon-card-title';
import { useTRPC } from '@/lib/client/trpc';
import { isBeforeDraw } from '@/lib/schema/edition';
import { useMutation } from '@tanstack/react-query';
import { ChevronDown, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PersonRow } from './person-row';
import { settingsErrorKey } from './settings-error';

/** Everyone in the group with who's in this edition (33), resend and remove (27); under it, the join link and email invites (45). */
export const PeopleSettings = ({ group, edition }: { group: GroupData; edition: GroupEdition | null }) => {
  const t = useTranslations('settings');
  const tShare = useTranslations('group.share');
  const joinLink = group.organizer?.joinLink;

  return (
    <Card>
      <CardHeader>
        <IconCardTitle icon={Users} tone="primary-muted">
          {t('people.title')}
        </IconCardTitle>
        <CardDescription>
          {edition ? t('people.in-edition', { count: edition.participantIds.length }) : tShare('joined', { count: group.joinedCount })}
        </CardDescription>
      </CardHeader>
      {edition && (
        <>
          <PeopleList group={group} edition={edition} />
          <CardDivider />
        </>
      )}
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="font-heading text-lg font-bold">{tShare('title')}</h3>
          {edition && <p className="text-sm text-muted">{tShare('joined', { count: group.joinedCount })}</p>}
        </div>
        <InvitePeople
          slug={group.slug}
          groupName={group.name}
          locale={group.locale}
          joinLink={joinLink}
          linkExtra={
            joinLink && (
              <details className="group/link-settings border-2 border-outline">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 font-semibold hover:bg-page group-open/link-settings:border-b-2 group-open/link-settings:border-dashed group-open/link-settings:border-outline [&::-webkit-details-marker]:hidden">
                  {tShare('settings.title')}
                  <ChevronDown aria-hidden="true" className="size-5 shrink-0 transition-transform group-open/link-settings:rotate-180" />
                </summary>
                <div className="p-3">
                  <JoinLinkSettings slug={group.slug} joinLink={joinLink} />
                </div>
              </details>
            )
          }
        />
      </CardContent>
    </Card>
  );
};

const PeopleList = ({ group, edition }: { group: GroupData; edition: GroupEdition }) => {
  const t = useTranslations('settings');
  const trpc = useTRPC();
  const refresh = useRefreshEdition(group.slug);
  const setParticipants = useMutation(trpc.settings.setParticipants.mutationOptions({ onSuccess: () => void refresh() }));
  const beforeDraw = isBeforeDraw(edition);
  const people = group.members.filter((m) => m.status !== 'requested');
  const tick = (memberId: string, checked: boolean) =>
    setParticipants.mutate({
      groupSlug: group.slug,
      editionNumber: edition.number,
      memberIds: checked ? [...edition.participantIds, memberId] : edition.participantIds.filter((id) => id !== memberId),
    });

  return (
    <CardContent className="flex flex-col gap-3">
      {!beforeDraw && <p className="text-sm text-muted">{t('people.drawn')}</p>}
      {setParticipants.error && <FieldError>{t(`errors.${settingsErrorKey(setParticipants.error)}`)}</FieldError>}
      <ul className="flex flex-col divide-y-2 divide-dashed divide-ink/30">
        {people.map((person) => (
          <PersonRow
            key={person.id}
            groupSlug={group.slug}
            editionTitle={edition.title}
            person={person}
            isMe={person.id === group.me.memberId}
            drawn={!beforeDraw && edition.status !== 'done'}
            ticked={
              beforeDraw && person.status === 'joined'
                ? {
                    checked: edition.participantIds.includes(person.id),
                    busy: setParticipants.isPending,
                    onChange: (checked) => tick(person.id, checked),
                  }
                : undefined
            }
          />
        ))}
      </ul>
    </CardContent>
  );
};
