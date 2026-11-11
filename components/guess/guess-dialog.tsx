import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { toast } from '@/components/ui/toast';
import type { EditionInput } from '@/components/between/edition-input';
import { useTRPC, type RouterOutputs } from '@/lib/client/trpc';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { VenetianMask } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Fragment, useState, type FormEvent } from 'react';
import { useGuessError } from './use-guess-error';

type GuessDialogProps = { input: EditionInput; mine: NonNullable<RouterOutputs['guess']['get']> };

/**
 * Who I think is my Santa (62) and the rest of the draw (82), a row per giftee; my own giftee's row is mine. Rows can
 * change until that Santa is out (94); a row once guessed can't go back to no guess.
 */
export const GuessDialog = ({ input, mine }: GuessDialogProps) => {
  const t = useTranslations('guess');
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const onError = useGuessError();
  const [open, setOpen] = useState(false);
  /** Giftee member id → Santa, for the rows changed in this dialog. */
  const [changed, setChanged] = useState<Record<string, string>>({});
  const set = useMutation(
    trpc.guess.set.mutationOptions({
      onSuccess: () => {
        setOpen(false);
        toast.add({ title: t('dialog.saved'), type: 'success' });
      },
      onError,
      onSettled: () => queryClient.invalidateQueries(trpc.guess.get.pathFilter()),
    })
  );
  const rows = Object.entries(changed).flatMap(([gifteeMemberId, santaMemberId]) => (santaMemberId ? [{ gifteeMemberId, santaMemberId }] : []));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (rows.length > 0) set.mutate({ ...input, rows });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setChanged({});
      }}
    >
      <DialogTrigger render={<Button className="self-start" />}>
        <VenetianMask aria-hidden="true" />
        {t(mine.rows.some((row) => row.santa) ? 'card.change' : 'card.make')}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('dialog.title')}</DialogTitle>
          <DialogDescription>{t('dialog.description')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-6">
          <dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
            {mine.rows.map((row, index) => (
              <Fragment key={row.memberId}>
                <dt className="font-semibold break-words">
                  <label htmlFor={`guess-${row.memberId}`}>{index === 0 ? t('dialog.yours') : t('dialog.row', { giftee: row.name })}</label>
                </dt>
                <dd>
                  <NativeSelect
                    id={`guess-${row.memberId}`}
                    className="w-full"
                    disabled={!row.open}
                    value={changed[row.memberId] ?? row.santa?.memberId ?? ''}
                    onChange={(event) => setChanged((current) => ({ ...current, [row.memberId]: event.target.value }))}
                  >
                    {!row.santa && <NativeSelectOption value="">{t('dialog.no-guess')}</NativeSelectOption>}
                    {mine.people
                      .filter((person) => person.memberId !== row.memberId)
                      .map((person) => (
                        <NativeSelectOption key={person.memberId} value={person.memberId}>
                          {person.name}
                        </NativeSelectOption>
                      ))}
                  </NativeSelect>
                </dd>
                {index === 0 && (
                  <>
                    <dt className="font-semibold break-words">{t('dialog.row', { giftee: mine.myGiftee.name })}</dt>
                    <dd className="flex h-11 items-center border-2 border-dashed border-outline px-3 text-muted">{t('dialog.you')}</dd>
                  </>
                )}
              </Fragment>
            ))}
          </dl>
          <DialogFooter>
            <DialogClose render={<Button variant="neutral" />}>{t('dialog.cancel')}</DialogClose>
            <Button type="submit" disabled={rows.length === 0 || set.isPending}>
              {t('dialog.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
