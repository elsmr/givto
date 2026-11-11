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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTRPC } from '@/lib/client/trpc';
import { MIN_PARTICIPANTS } from '@/lib/schema/group';
import { drawsNames } from '@/lib/schema/edition';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Lock, Shuffle } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useId, useRef, useState } from 'react';
import type { GroupData, GroupEdition } from '../group/group-data';
import { DrawError } from './draw-error';
import { DrawRules } from './draw-rules';
import { useRefreshEdition } from './use-refresh-edition';

/**
 * Organizer, open edition: "Draw names" now, after a confirmation that says who's not in (34, 64); "Lock in" for a
 * white elephant (88) or conspiracy (90), which have no draw. Too few people: disabled, with how many more as its tooltip and description.
 */
export const DrawNamesButton = ({ group, edition }: { group: GroupData; edition: GroupEdition }) => {
  const lockIn = !drawsNames(edition);
  const t = useTranslations(lockIn ? 'draw.lock-in' : 'draw.before');
  const tLockIn = useTranslations('draw.lock-in');
  const Icon = lockIn ? Lock : Shuffle;
  const reasonId = useId();
  const missing = MIN_PARTICIPANTS - group.members.filter((m) => edition.participantIds.includes(m.id)).length;
  // In the group but not in this draw (invited, asking to join, sitting out): the draw doesn't wait for them.
  const leftOut = group.members.filter((m) => m.status !== 'removed' && !edition.participantIds.includes(m.id)).map((m) => m.name);
  const { slug: groupSlug, members } = group;
  const editionNumber = edition.number;
  const format = useFormatter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const refresh = useRefreshEdition(groupSlug);
  const [open, setOpen] = useState(false);
  const input = { groupSlug, editionNumber };
  const drawn = useRef(false);
  // The button goes once the edition is drawn. So: load what the drawn page shows first (no
  // skeletons), close with the exit animation, and only then let the page switch to drawn.
  const onSuccess = async () => {
    await Promise.all([
      queryClient.prefetchQuery({ ...trpc.draw.mine.queryOptions(input), staleTime: 0 }),
      queryClient.prefetchQuery({ ...trpc.giftday.get.queryOptions(input), staleTime: 0 }),
    ]);
    drawn.current = true;
    setOpen(false);
  };
  const draw = useMutation(trpc.draw.run.mutationOptions({ onSuccess }));
  const lock = useMutation(trpc.draw.lockIn.mutationOptions({ onSuccess }));
  const run = lockIn ? lock : draw;
  const onClosed = async () => {
    if (!drawn.current) return;
    drawn.current = false;
    await refresh();
    toast.add({ title: t('drawn'), type: 'success' });
  };

  if (missing > 0) {
    // A disabled button gets no pointer events: the wrapper shows the tooltip on hover, and on focus of the button inside.
    return (
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>
          <Button focusableWhenDisabled disabled aria-describedby={reasonId}>
            <Icon aria-hidden="true" />
            {t('draw')}
          </Button>
          <span id={reasonId} className="sr-only">
            {t('too-few', { count: missing })}
          </span>
        </TooltipTrigger>
        <TooltipContent>{t('too-few', { count: missing })}</TooltipContent>
      </Tooltip>
    );
  }

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
      <DialogTrigger render={<Button />}>
        <Icon aria-hidden="true" />
        {t('draw')}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('confirm-title')}</DialogTitle>
          <DialogDescription>{edition.kind === 'conspiracy' ? tLockIn('confirm-description-conspiracy') : t('confirm-description')}</DialogDescription>
        </DialogHeader>
        {!lockIn && <DrawRules group={group} edition={edition} />}
        {leftOut.length > 0 && <p>{t('left-out', { names: format.list(leftOut) })}</p>}
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
