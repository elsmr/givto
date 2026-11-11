import { AvatarStack } from '@/components/group/avatar-stack';
import type { GroupData, GroupEdition } from '@/components/group/group-data';
import { InvitePeople } from '@/components/group/invite-people';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { IconCardTitle } from '@/components/ui/icon-card-title';
import { UserPlus } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { DrawRules } from './draw-rules';

/**
 * Open edition (61): who's in and when names are drawn; the organizer invites (link, QR or email).
 * Draw names is in the group header; names on the People tab; link settings and keep apart in the settings.
 */
export const GetEveryoneInCard = ({ group, edition }: { group: GroupData; edition: GroupEdition }) => {
  const t = useTranslations('draw.before');
  const format = useFormatter();
  const people = group.members.filter((m) => edition.participantIds.includes(m.id));
  const joinLink = group.organizer?.joinLink;

  return (
    <Card>
      <CardHeader>
        <IconCardTitle icon={UserPlus} tone="mint">
          {t('title')}
        </IconCardTitle>
        {edition.drawAt && (
          <CardDescription>{t('scheduled', { date: format.dateTime(edition.drawAt, { dateStyle: 'full', timeZone: edition.timeZone }) })}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {people.length === 0 ? (
          <p className="font-semibold">{t('who', { count: 0 })}</p>
        ) : (
          <AvatarStack
            people={people}
            label={t('who-names', { count: people.length, names: format.list(people.map((person) => person.name)) })}
          />
        )}
        <DrawRules group={group} edition={edition} />
        {group.me.isOrganizer && <InvitePeople slug={group.slug} groupName={group.name} locale={group.locale} joinLink={joinLink} />}
      </CardContent>
    </Card>
  );
};
