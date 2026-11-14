import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { useTRPC } from '@/lib/client/trpc';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Lightbulb } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import type { EditionInput } from './edition-input';
import { TipForm } from './tip-form';
import { useBetweenError } from './use-between-error';

const emptyTip = { aboutMemberId: '', text: '', anonymous: true };

type NewTipDialogProps = {
  input: EditionInput;
  people: { memberId: string; name: string }[];
  /** Opens the dialog from inline link text instead of the "Leave a tip" button. */
  children?: ReactNode;
};

/** "Leave a tip" (42) in a dialog, so the form isn't always open on the page (61). Closes once saved. */
export const NewTipDialog = ({ input, people, children }: NewTipDialogProps) => {
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
      {children ? (
        <DialogTrigger render={<button type="button" className="font-semibold text-ink underline underline-offset-4 hover:text-primary" />}>
          {children}
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button variant="neutral" className="self-start" />}>
          <Lightbulb aria-hidden="true" />
          {t('add')}
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('add')}</DialogTitle>
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

/** A quiet way into tips outside the People tab. Nothing while tips are closed or there's nobody to leave one about. */
export const LeaveTipLink = ({ input, className }: { input: EditionInput; className?: string }) => {
  const t = useTranslations('between.tips');
  const trpc = useTRPC();
  const authored = useQuery(trpc.tip.authored.queryOptions(input)).data;

  if (!authored?.canWrite || authored.people.length === 0) return null;
  return (
    <p className={cn('text-sm text-muted', className)}>
      {t.rich('nudge', {
        link: (chunks) => (
          <NewTipDialog input={input} people={authored.people}>
            {chunks}
          </NewTipDialog>
        ),
      })}
    </p>
  );
};
