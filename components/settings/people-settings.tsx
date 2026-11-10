import type { GroupData, GroupEdition } from '@/components/group/group-data';
import { useRefreshEdition } from '@/components/draw/use-refresh-edition';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { FieldError } from '@/components/ui/field';
import { IconCardTitle } from '@/components/ui/icon-card-title';
import { useTRPC } from '@/lib/client/trpc';
import { isBeforeDraw } from '@/lib/schema/edition';
import { useMutation } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PersonRow } from './person-row';
import { settingsErrorKey } from './settings-error';

/** Everyone in the group with who's in this edition (33), resend and remove (27). */
export const PeopleSettings = ({ group, edition }: { group: GroupData; edition: GroupEdition }) => {
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
    <Card>
      <CardHeader>
        <IconCardTitle icon={Users} tone="primary-muted">
          {t('people.title')}
        </IconCardTitle>
        <CardDescription>{t('people.in-edition', { count: edition.participantIds.length })}</CardDescription>
      </CardHeader>
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
    </Card>
  );
};
