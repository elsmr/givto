import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { GroupData } from './group-data';
import { IconCardTitle } from '@/components/ui/icon-card-title';
import { useInvalidateGroup } from './use-invalidate-group';

/** People who joined via a link that needs approval (45). Organizer only. */
export const PendingRequests = ({ group }: { group: GroupData }) => {
  const t = useTranslations('group.requests');
  const trpc = useTRPC();
  const invalidate = useInvalidateGroup(group.slug);
  const approve = useMutation(trpc.membership.approve.mutationOptions({ onSuccess: invalidate }));
  const reject = useMutation(trpc.membership.reject.mutationOptions({ onSuccess: invalidate }));
  const requested = group.members.filter((m) => m.status === 'requested');
  const busy = approve.isPending || reject.isPending;

  if (requested.length === 0) return null;
  return (
    <Card className="bg-yellow">
      <CardHeader>
        <IconCardTitle icon={UserPlus} tone="mint">
          {t('title', { count: requested.length })}
        </IconCardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-4">
          {requested.map((person) => (
            <li key={person.id} className="flex flex-wrap items-center gap-3">
              <span className="flex-1 font-semibold break-all">
                {person.name} {person.email && <span className="font-normal">({person.email})</span>}
              </span>
              <Button size="sm" disabled={busy} onClick={() => approve.mutate({ groupSlug: group.slug, memberId: person.id })}>
                {t('approve')}
              </Button>
              <Button size="sm" variant="neutral" disabled={busy} onClick={() => reject.mutate({ groupSlug: group.slug, memberId: person.id })}>
                {t('reject')}
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
