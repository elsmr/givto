import { DrawError } from '@/components/draw/draw-error';
import { useRefreshEdition } from '@/components/draw/use-refresh-edition';
import type { GroupData, GroupEdition } from '@/components/group/group-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

/** Re-draw before gift day (27), behind a clear warning. */
export const RedrawSection = ({ group, edition }: { group: GroupData; edition: GroupEdition }) => {
  const t = useTranslations('settings.redraw');
  const trpc = useTRPC();
  const refresh = useRefreshEdition(group.slug);
  const redraw = useMutation(
    trpc.draw.redraw.mutationOptions({
      onSuccess: () => {
        toast.add({ title: t('done'), type: 'success' });
        void refresh();
      },
    })
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t('title')}</h2>
        </CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {redraw.error && <DrawError error={redraw.error} members={group.members} />}
        <Dialog>
          <DialogTrigger render={<Button variant="neutral" className="self-start" />}>{t('button')}</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('confirm-title')}</DialogTitle>
              <DialogDescription>{t('description')}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="neutral" />}>{t('cancel')}</DialogClose>
              <DialogClose
                render={<Button variant="danger" />}
                disabled={redraw.isPending}
                onClick={() => redraw.mutate({ groupSlug: group.slug, editionNumber: edition.number })}
              >
                {t('confirm')}
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
