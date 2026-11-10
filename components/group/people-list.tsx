import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { GroupData } from './group-data';
import { IconTile } from './icon-tile';
import { PersonAvatar } from './person-avatar';

/** Everyone sees names; only the organizer sees emails and invite statuses (privacy rules), and gets to the people settings. */
export const PeopleList = ({ group }: { group: GroupData }) => {
  const t = useTranslations('group.people');
  const people = group.members.filter((m) => m.status !== 'requested');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <IconTile icon={Users} tone="primary-muted" />
          <CardTitle>
            <h2>{t('title', { count: group.joinedCount })}</h2>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ul className="flex flex-col divide-y-2 divide-dashed divide-ink/30">
          {people.map((person) => (
            <li key={person.id} className="flex items-center gap-3 py-2.5">
              <PersonAvatar id={person.id} name={person.name} />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-semibold break-all">{person.name}</span>
                  {person.role === 'organizer' && <Badge variant="yellow">{t('organizer')}</Badge>}
                  {person.id === group.me.memberId && <Badge>{t('you')}</Badge>}
                  {person.status !== 'joined' && <Badge variant="coral">{t(`status.${person.status}`)}</Badge>}
                  {person.bounced && <Badge variant="coral">{t('bounced')}</Badge>}
                </div>
                {person.email && <span className="text-sm text-muted break-all">{person.email}</span>}
              </div>
            </li>
          ))}
        </ul>
        {group.organizer && (
          <Link href={`/g/${group.slug}/settings`} className={buttonVariants({ variant: 'neutral', className: 'self-start' })}>
            {t('manage')}
          </Link>
        )}
      </CardContent>
    </Card>
  );
};
