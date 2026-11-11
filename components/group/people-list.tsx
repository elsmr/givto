import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Flame, Sparkles, Target, Trophy, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { GroupData } from './group-data';
import { IconCardTitle } from '@/components/ui/icon-card-title';
import { PersonAvatar } from './person-avatar';

const badgeIcons = { champion: Trophy, backToBack: Flame, perfect: Sparkles, nailed: Target };

/** Everyone sees names; only the organizer sees emails and invite statuses (privacy rules), and gets to the people settings. */
export const PeopleList = ({ group }: { group: GroupData }) => {
  const t = useTranslations('group.people');
  const people = group.members.filter((m) => m.status !== 'requested');

  return (
    <Card>
      <CardHeader>
        <IconCardTitle icon={Users} tone="primary-muted">
          {t('title', { count: group.joinedCount })}
        </IconCardTitle>
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
                  {person.badges.map(({ kind, count }) => {
                    const Icon = badgeIcons[kind];
                    return (
                      <Badge key={kind} variant="primary-muted">
                        <Icon aria-hidden="true" />
                        {t(`badges.${kind}`, { count })}
                      </Badge>
                    );
                  })}
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
