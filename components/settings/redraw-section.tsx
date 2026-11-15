import { DrawError } from '@/components/draw/draw-error';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
} from '@/components/ui/dialog';
import { SettingsRow } from '@/components/ui/settings-group';
import { toast } from '@/components/ui/toast';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation } from '@tanstack/react-query';
import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';

type RedrawProps = { group: GroupData; edition: GroupEdition };

/** "Draw all names again?" (27), from Settings and the ⋯ menu. Stays open on a refused draw to say why. */
export const RedrawDialog = ({ group, edition, onClose }: RedrawProps & { onClose: () => void }) => {
  const t = useTranslations('draw.redraw');
  const trpc = useTRPC();
  const refresh = useRefreshEdition(group.slug);
  const redraw = useMutation(
    trpc.draw.redraw.mutationOptions({
      onSuccess: () => {
        toast.add({ title: t('done'), type: 'success' });
        void refresh();
        onClose();
      },
    })
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('confirm-title')}</DialogTitle>
          <DialogDescription>{t('confirm-description')}</DialogDescription>
        </DialogHeader>
        {redraw.error && <DrawError error={redraw.error} members={group.members} />}
        <DialogFooter>
          <DialogClose render={<Button variant="neutral" />}>{t('cancel')}</DialogClose>
          <Button
            variant="danger"
            disabled={redraw.isPending}
            onClick={() => redraw.mutate({ groupSlug: group.slug, editionNumber: edition.number })}
          >
            {t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/** Re-draw before gift day (27), behind a clear warning. */
export const RedrawSection = ({ group, edition }: RedrawProps) => {
  const t = useTranslations('draw.redraw');
  const [open, setOpen] = useState(false);

  return (
    <SettingsRow label={t('title')} description={t('description')}>
      <Button variant="neutral" onClick={() => setOpen(true)}>
        {t('button')}
      </Button>
      {open && <RedrawDialog group={group} edition={edition} onClose={() => setOpen(false)} />}
    </SettingsRow>
  );
};

/**
 * Organizer only, while drawn (105): people in who couldn't be slotted in after the draw, and people who left but
 * stay in it because no draw works without them. Re-draw, or leave it.
 */
export const DrawGapsNote = ({ group, edition }: RedrawProps) => {
  const t = useTranslations('draw.gaps');
  const tRedraw = useTranslations('draw.redraw');
  const format = useFormatter();
  const [open, setOpen] = useState(false);
  const { notInDraw = [], leftInDraw = [] } = group.organizer ?? {};

  if (notInDraw.length + leftInDraw.length === 0) return null;
  return (
    <Alert variant="yellow">
      <AlertDescription className="flex flex-col gap-3">
        {notInDraw.length > 0 && <p>{t('not-in', { names: format.list(notInDraw) })}</p>}
        {leftInDraw.length > 0 && <p>{t('left', { names: format.list(leftInDraw) })}</p>}
        <Button variant="neutral" className="self-start" onClick={() => setOpen(true)}>
          {tRedraw('button')}
        </Button>
      </AlertDescription>
      {open && <RedrawDialog group={group} edition={edition} onClose={() => setOpen(false)} />}
    </Alert>
  );
};
