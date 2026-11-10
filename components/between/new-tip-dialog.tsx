import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Lightbulb } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { EditionInput } from './edition-input';
import { TipForm } from './tip-form';
import { useBetweenError } from './use-between-error';

const emptyTip = { aboutMemberId: '', text: '', anonymous: true };

type NewTipDialogProps = { input: EditionInput; people: { memberId: string; name: string }[] };

/** "Leave a tip" (42) in a dialog, so the form isn't always open on the page (61). Closes once saved. */
export const NewTipDialog = ({ input, people }: NewTipDialogProps) => {
  const t = useTranslations('between.tips');
  const errorMessage = useBetweenError();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const create = useMutation(
    trpc.tip.create.mutationOptions({
      onSuccess: (tip) => {
        toast.add({ title: t('added', { name: tip.aboutName }), type: 'success' });
        setOpen(false);
      },
      onSettled: () => queryClient.invalidateQueries({ queryKey: trpc.tip.pathKey() }),
    })
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        create.reset();
      }}
    >
      <DialogTrigger render={<Button variant="neutral" className="self-start" />}>
        <Lightbulb aria-hidden="true" />
        {t('add')}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('add')}</DialogTitle>
          <DialogDescription>{t('dialog-description')}</DialogDescription>
        </DialogHeader>
        <TipForm
          initial={emptyTip}
          people={people}
          submitLabel={t('add')}
          busy={create.isPending}
          error={create.error ? errorMessage(create.error) : undefined}
          onSubmit={(draft) => create.mutate({ ...input, ...draft })}
        />
      </DialogContent>
    </Dialog>
  );
};
