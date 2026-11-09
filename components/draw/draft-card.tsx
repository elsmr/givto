import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/toast';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { GroupData, GroupEdition } from '../group/group-data';
import { DrawError } from './draw-error';
import { useRefreshEdition } from './use-refresh-edition';

/** Draft edition (33): nothing is sent; the organizer checks who's in, then opens it. */
export const DraftCard = ({ group, edition }: { group: GroupData; edition: GroupEdition }) => {
  const t = useTranslations('draw.draft');
  const trpc = useTRPC();
  const refresh = useRefreshEdition(group.slug);
  const open = useMutation(
    trpc.edition.open.mutationOptions({
      onSuccess: async () => {
        await refresh();
        toast.add({ title: t('opened'), type: 'success' });
      },
    })
  );

  return (
    <Card className="bg-yellow">
      <CardHeader>
        <CardTitle>
          <h2>{t('title')}</h2>
        </CardTitle>
        <CardDescription className="text-ink">{group.me.isOrganizer ? t('description') : t('member')}</CardDescription>
      </CardHeader>
      {group.me.isOrganizer && (
        <CardContent className="flex flex-col gap-4">
          {open.error && <DrawError error={open.error} members={group.members} />}
          <div className="flex flex-col gap-3 xs:flex-row xs:flex-wrap">
            <Button variant="neutral" nativeButton={false} render={<Link href={`/g/${group.slug}/settings`} />}>
              {t('settings')}
            </Button>
            <Button disabled={open.isPending} onClick={() => open.mutate({ groupSlug: group.slug, editionNumber: edition.number })}>
              {t('open')}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
};
