import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import type { GroupData } from './group-data';

/** Everyone sees names; only the organizer sees emails and invite statuses (privacy rules). */
export const PeopleList = ({ group }: { group: GroupData }) => {
  const t = useTranslations('group.people');
  const people = group.members.filter((m) => m.status !== 'requested');

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t('title', { count: group.joinedCount })}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col divide-y-2 divide-ink/10">
          {people.map((person) => (
            <li key={person.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
              <span className="font-semibold break-all">{person.name}</span>
              {person.role === 'organizer' && <Badge variant="yellow">{t('organizer')}</Badge>}
              {person.id === group.me.memberId && <Badge>{t('you')}</Badge>}
              {person.status !== 'joined' && <Badge variant="coral">{t(`status.${person.status}`)}</Badge>}
              {person.email && <span className="w-full text-sm text-muted break-all">{person.email}</span>}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
