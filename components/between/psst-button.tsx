import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import type { EditionInput } from './edition-input';
import { useBetweenError } from './use-between-error';

/** Psst! (30): ask your giftee for ideas, or for more detail once they have wishes. One per few days; the dialog says when. */
export const PsstButton = ({ input }: { input: EditionInput }) => {
  const t = useTranslations('between.psst');
  const format = useFormatter();
  const errorMessage = useBetweenError();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const status = useQuery(trpc.nudge.status.queryOptions(input));
  const send = useMutation(
    trpc.nudge.send.mutationOptions({
      onSuccess: () => {
        setOpen(false);
        toast.add({ title: t('sent', { name: status.data?.giftee.name ?? '' }), type: 'success' });
      },
      onError: (error) => toast.add({ title: errorMessage(error), type: 'error' }),
      onSettled: () => queryClient.invalidateQueries({ queryKey: trpc.nudge.status.pathKey() }),
    })
  );

  if (!status.data) return null;
  const { giftee, kind, canNudge, answersOwnQuestions, nextAt } = status.data;
  if (answersOwnQuestions || (!canNudge && !nextAt)) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="neutral" size="sm" />}>
        <Sparkles aria-hidden="true" />
        {t('title')}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t(kind, { name: giftee.name })}</DialogDescription>
        </DialogHeader>
        {nextAt ? (
          <p className="text-sm text-muted">{t('next', { date: format.dateTime(nextAt, { weekday: 'long', day: 'numeric', month: 'long' }) })}</p>
        ) : (
          <DialogFooter>
            <Button disabled={send.isPending} onClick={() => send.mutate({ ...input, kind })}>
              {t('send')}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
