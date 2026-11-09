import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MIN_PARTICIPANTS } from '@/lib/schema/group';
import { useFormatter, useTranslations } from 'next-intl';
import Link from 'next/link';
import type { GroupData, GroupEdition } from '../group/group-data';
import { DrawNamesButton } from './draw-names-button';

/** Open edition: who's in, when names are drawn, and "Draw names" for the organizer. */
export const BeforeDrawCard = ({ group, edition }: { group: GroupData; edition: GroupEdition }) => {
  const t = useTranslations('draw.before');
  const format = useFormatter();
  const people = group.members.filter((m) => edition.participantIds.includes(m.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t('title')}</h2>
        </CardTitle>
        <CardDescription>
          {edition.drawAt
            ? t('scheduled', { date: format.dateTime(edition.drawAt, { dateStyle: 'full', timeZone: edition.timeZone }) })
            : t('manual')}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p>{t('who', { count: people.length })}</p>
        <ul className="flex flex-wrap gap-2">
          {people.map((person) => (
            <li key={person.id} className="border-2 border-ink bg-primary-muted px-2 py-0.5 font-semibold break-all">
              {person.name}
            </li>
          ))}
        </ul>
        {people.length < MIN_PARTICIPANTS && <p className="text-muted">{t('too-few', { min: MIN_PARTICIPANTS })}</p>}
        {group.me.isOrganizer && (
          <div className="flex flex-col gap-3 xs:flex-row xs:flex-wrap xs:items-center">
            <DrawNamesButton groupSlug={group.slug} editionNumber={edition.number} members={group.members} />
            <Link href={`/g/${group.slug}/settings`} className={buttonVariants({ variant: 'neutral' })}>
              {t('change')}
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
