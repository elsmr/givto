import { DrawError } from '@/components/draw/draw-error';
import { useRefreshEdition } from '@/components/draw/use-refresh-edition';
import type { GroupData, GroupEdition } from '@/components/group/group-data';
import { Button } from '@/components/ui/button';
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
import { SettingsRow } from '@/components/ui/settings-group';
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
    <SettingsRow label={t('title')} description={t('description')} below={redraw.error && <DrawError error={redraw.error} members={group.members} />}>
      <Dialog>
        <DialogTrigger render={<Button variant="neutral" />}>{t('button')}</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confirm-title')}</DialogTitle>
            <DialogDescription>{t('confirm-description')}</DialogDescription>
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
    </SettingsRow>
  );
};
