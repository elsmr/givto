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
import { toast } from '@/components/ui/toast';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation } from '@tanstack/react-query';
import { Shuffle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { GroupMember } from '../group/group-data';
import { DrawError } from './draw-error';
import { useRefreshEdition } from './use-refresh-edition';

type DrawNamesButtonProps = { groupSlug: string; editionNumber: number; members: GroupMember[]; primary: boolean };

/** Organizer: "Draw names" now, after a confirmation (34). */
export const DrawNamesButton = ({ groupSlug, editionNumber, members, primary }: DrawNamesButtonProps) => {
  const t = useTranslations('draw.before');
  const trpc = useTRPC();
  const refresh = useRefreshEdition(groupSlug);
  const [open, setOpen] = useState(false);
  const run = useMutation(
    trpc.draw.run.mutationOptions({
      onSuccess: async () => {
        await refresh();
        setOpen(false);
        toast.add({ title: t('drawn'), type: 'success' });
      },
    })
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        run.reset();
      }}
    >
      <DialogTrigger render={<Button size="lg" variant={primary ? 'default' : 'neutral'} />}>
        <Shuffle aria-hidden="true" />
        {t('draw')}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('confirm-title')}</DialogTitle>
          <DialogDescription>{t('confirm-description')}</DialogDescription>
        </DialogHeader>
        {run.error && <DrawError error={run.error} members={members} />}
        <DialogFooter>
          <DialogClose render={<Button variant="neutral" />}>{t('cancel')}</DialogClose>
          <Button disabled={run.isPending} onClick={() => run.mutate({ groupSlug, editionNumber })}>
            {t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
