import { AvatarStack } from '@/components/group/avatar-stack';
import { Doodle } from '@/components/group/doodle';
import type { GroupData, GroupEdition } from '@/components/group/group-data';
import { SharePanel } from '@/components/group/share-panel';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { IconCardTitle } from '@/components/ui/icon-card-title';
import { MIN_PARTICIPANTS } from '@/lib/schema/group';
import { UserPlus } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { DrawNamesButton } from './draw-names-button';

/**
 * Open edition (61): how many are in and when names are drawn; the organizer shares the join link and
 * draws. Names are in the People tab; link settings, email invites and keep apart in the settings.
 */
export const GetEveryoneInCard = ({ group, edition }: { group: GroupData; edition: GroupEdition }) => {
  const t = useTranslations('draw.before');
  const tShare = useTranslations('group.share');
  const format = useFormatter();
  const people = group.members.filter((m) => edition.participantIds.includes(m.id));
  const tooFew = people.length < MIN_PARTICIPANTS;
  const leftOut = group.members.filter((m) => m.status !== 'removed' && !edition.participantIds.includes(m.id)).map((m) => m.name);
  const { isOrganizer } = group.me;
  const joinLink = group.organizer?.joinLink;

  return (
    <Card className="relative">
      <Doodle shape="starburst" className="absolute top-3 right-3 size-14 text-primary-muted" />
      <CardHeader className="pr-20">
        <IconCardTitle icon={UserPlus} tone="mint">
          {t('title')}
        </IconCardTitle>
        <CardDescription>
          {edition.drawAt
            ? t('scheduled', { date: format.dateTime(edition.drawAt, { dateStyle: 'full', timeZone: edition.timeZone }) })
            : t(isOrganizer ? 'manual-organizer' : 'manual')}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <p className="shrink-0 font-semibold">{t('who', { count: people.length })}</p>
          {people.length > 0 && <AvatarStack people={people} />}
        </div>
        {tooFew && <p className="text-muted">{t('too-few', { min: MIN_PARTICIPANTS })}</p>}
        {isOrganizer && (
          <>
            {joinLink && !joinLink.revoked ? (
              <SharePanel slug={group.slug} token={joinLink.token} groupName={group.name} locale={group.locale} />
            ) : (
              <p>{tShare('revoked')}</p>
            )}
            <div className="flex flex-col xs:flex-row">
              <DrawNamesButton groupSlug={group.slug} editionNumber={edition.number} members={group.members} leftOut={leftOut} primary={!tooFew} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
