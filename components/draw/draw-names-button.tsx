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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Shuffle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import type { GroupMember } from '../group/group-data';
import { DrawError } from './draw-error';
import { useRefreshEdition } from './use-refresh-edition';

type DrawNamesButtonProps = { groupSlug: string; editionNumber: number; members: GroupMember[]; primary: boolean };

/** Organizer: "Draw names" now, after a confirmation (34). */
export const DrawNamesButton = ({ groupSlug, editionNumber, members, primary }: DrawNamesButtonProps) => {
  const t = useTranslations('draw.before');
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const refresh = useRefreshEdition(groupSlug);
  const [open, setOpen] = useState(false);
  const input = { groupSlug, editionNumber };
  const drawn = useRef(false);
  // This dialog lives in the card the draw replaces. So: load what the drawn page shows first (no
  // skeletons), close with the exit animation, and only then let the page switch to drawn.
  const run = useMutation(
    trpc.draw.run.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.prefetchQuery({ ...trpc.draw.mine.queryOptions(input), staleTime: 0 }),
          queryClient.prefetchQuery({ ...trpc.giftday.get.queryOptions(input), staleTime: 0 }),
        ]);
        drawn.current = true;
        setOpen(false);
      },
    })
  );
  const onClosed = async () => {
    if (!drawn.current) return;
    drawn.current = false;
    await refresh();
    toast.add({ title: t('drawn'), type: 'success' });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        run.reset();
      }}
      onOpenChangeComplete={(isOpen) => {
        if (!isOpen) void onClosed();
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
          <Button disabled={run.isPending} onClick={() => run.mutate(input)}>
            {t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
