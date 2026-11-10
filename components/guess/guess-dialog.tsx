import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FieldLegend, FieldSet } from '@/components/ui/field';
import { toast } from '@/components/ui/toast';
import type { EditionInput } from '@/components/between/edition-input';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Lock, VenetianMask } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { useGuessError } from './use-guess-error';

type GuessDialogProps = { input: EditionInput; people: { memberId: string; name: string }[] };

/** Pick who you think your Santa is (62) and lock it in: one guess, no changes. */
export const GuessDialog = ({ input, people }: GuessDialogProps) => {
  const t = useTranslations('guess');
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const onError = useGuessError();
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<string | null>(null);
  const make = useMutation(
    trpc.guess.make.mutationOptions({
      onSuccess: () => {
        setOpen(false);
        toast.add({ title: t('dialog.locked'), type: 'success' });
      },
      onError,
      onSettled: () => queryClient.invalidateQueries(trpc.guess.mine.pathFilter()),
    })
  );
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (choice) make.mutate({ ...input, memberId: choice });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="self-start" />}>
        <VenetianMask aria-hidden="true" />
        {t('card.make')}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('dialog.title')}</DialogTitle>
          <DialogDescription>{t('dialog.description')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-6">
          <FieldSet>
            <FieldLegend variant="label" className="font-semibold">
              {t('dialog.people')}
            </FieldLegend>
            <div className="grid gap-2 sm:grid-cols-2">
              {people.map((person) => (
                <label
                  key={person.memberId}
                  className="flex min-h-11 cursor-pointer items-center gap-3 border-2 border-outline bg-surface px-3 py-2 font-semibold break-words text-ink hover:bg-page has-checked:bg-yellow has-checked:shadow-sm has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-focus has-[:focus-visible]:outline-solid"
                >
                  <input
                    type="radio"
                    name="guess"
                    value={person.memberId}
                    checked={choice === person.memberId}
                    onChange={() => setChoice(person.memberId)}
                    className="size-5 shrink-0 accent-primary"
                  />
                  {person.name}
                </label>
              ))}
            </div>
          </FieldSet>
          <DialogFooter>
            <DialogClose render={<Button variant="neutral" />}>{t('dialog.cancel')}</DialogClose>
            <Button type="submit" disabled={!choice || make.isPending}>
              <Lock aria-hidden="true" />
              {t('dialog.lock')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
