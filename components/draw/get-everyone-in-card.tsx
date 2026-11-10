import { Doodle } from '@/components/group/doodle';
import type { GroupData, GroupEdition } from '@/components/group/group-data';
import { IconCardTitle } from '@/components/ui/icon-card-title';
import { SharePanel } from '@/components/group/share-panel';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { MIN_PARTICIPANTS } from '@/lib/schema/group';
import { UserPlus } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import Link from 'next/link';
import { DrawNamesButton } from './draw-names-button';

/**
 * Open edition (61): who's in and when names are drawn; the organizer shares the join link and draws.
 * Link settings, email invites and keep apart are in the settings.
 */
export const GetEveryoneInCard = ({ group, edition }: { group: GroupData; edition: GroupEdition }) => {
  const t = useTranslations('draw.before');
  const tShare = useTranslations('group.share');
  const format = useFormatter();
  const people = group.members.filter((m) => edition.participantIds.includes(m.id));
  const tooFew = people.length < MIN_PARTICIPANTS;
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
            : t('manual')}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="font-semibold">{t('who', { count: people.length })}</p>
        <ul className="flex flex-wrap gap-2">
          {people.map((person) => (
            <li key={person.id} className="border-2 border-outline bg-primary-muted px-2 py-0.5 font-semibold break-all">
              {person.name}
            </li>
          ))}
        </ul>
        {tooFew && <p className="text-muted">{t('too-few', { min: MIN_PARTICIPANTS })}</p>}
        {group.me.isOrganizer && (
          <>
            <hr className="border-t-2 border-dashed border-ink/40" />
            {joinLink && !joinLink.revoked ? (
              <SharePanel slug={group.slug} token={joinLink.token} groupName={group.name} locale={group.locale} primary={tooFew} />
            ) : (
              <p>{tShare('revoked')}</p>
            )}
            <div className="flex flex-col gap-3 xs:flex-row xs:flex-wrap xs:items-center">
              <DrawNamesButton groupSlug={group.slug} editionNumber={edition.number} members={group.members} primary={!tooFew} />
              <Link href={`/g/${group.slug}/settings`} className={buttonVariants({ variant: 'neutral' })}>
                {t('change')}
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
