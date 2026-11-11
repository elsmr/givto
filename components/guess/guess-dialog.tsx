import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FieldLegend, FieldSet } from '@/components/ui/field';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { toast } from '@/components/ui/toast';
import type { EditionInput } from '@/components/between/edition-input';
import { useTRPC, type RouterOutputs } from '@/lib/client/trpc';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Lock, VenetianMask } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Fragment, useState, type FormEvent } from 'react';
import { useGuessError } from './use-guess-error';

type Mine = NonNullable<RouterOutputs['guess']['mine']>;
type GuessDialogProps = { input: EditionInput; people: Mine['people']; board: NonNullable<Mine['board']> };

/**
 * Pick who you think your Santa is (62), and optionally the rest of the draw (82), and lock it in:
 * one go, no changes. Each person can be picked as Santa once; your own giftee's row is yours.
 */
export const GuessDialog = ({ input, people, board }: GuessDialogProps) => {
  const t = useTranslations('guess');
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const onError = useGuessError();
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<string | null>(null);
  /** Giftee member id → guessed Santa. */
  const [pairs, setPairs] = useState<Record<string, string>>({});
  const taken = new Set([choice, ...Object.values(pairs)]);
  const pick = (memberId: string) => {
    setChoice(memberId);
    setPairs((current) => Object.fromEntries(Object.entries(current).filter(([, santa]) => santa !== memberId)));
  };
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
    const rows = Object.entries(pairs).map(([gifteeMemberId, santaMemberId]) => ({ gifteeMemberId, santaMemberId }));
    if (choice) make.mutate({ ...input, memberId: choice, pairs: rows });
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
                  className="flex min-h-11 cursor-pointer items-center gap-3 border-2 border-outline bg-surface px-3 py-2 font-semibold break-words text-ink hover:bg-page has-checked:bg-primary-muted has-checked:shadow-sm has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-focus has-[:focus-visible]:outline-solid"
                >
                  <input
                    type="radio"
                    name="guess"
                    value={person.memberId}
                    checked={choice === person.memberId}
                    onChange={() => pick(person.memberId)}
                    className="size-5 shrink-0 accent-primary"
                  />
                  {person.name}
                </label>
              ))}
            </div>
          </FieldSet>
          {board.rows.length > 0 && (
            <FieldSet>
              <FieldLegend variant="label" className="font-semibold" optional hint={t('dialog.board-hint')}>
                {t('dialog.board')}
              </FieldLegend>
              <dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
                <dt className="font-semibold break-words">{t('dialog.row', { giftee: board.myGiftee.name })}</dt>
                <dd className="flex h-11 items-center border-2 border-dashed border-outline px-3 text-muted">{t('dialog.you')}</dd>
                {board.rows.map((row) => (
                  <Fragment key={row.memberId}>
                    <dt className="font-semibold break-words">
                      <label htmlFor={`board-${row.memberId}`}>{t('dialog.row', { giftee: row.name })}</label>
                    </dt>
                    <dd>
                      <NativeSelect
                        id={`board-${row.memberId}`}
                        className="w-full"
                        value={pairs[row.memberId] ?? ''}
                        onChange={(event) => {
                          const { value } = event.target;
                          setPairs(({ [row.memberId]: _, ...rest }) => (value ? { ...rest, [row.memberId]: value } : rest));
                        }}
                      >
                        <NativeSelectOption value="">{t('dialog.no-guess')}</NativeSelectOption>
                        {people
                          .filter((person) => person.memberId !== row.memberId)
                          .map((person) => (
                            <NativeSelectOption
                              key={person.memberId}
                              value={person.memberId}
                              disabled={taken.has(person.memberId) && pairs[row.memberId] !== person.memberId}
                            >
                              {person.name}
                            </NativeSelectOption>
                          ))}
                      </NativeSelect>
                    </dd>
                  </Fragment>
                ))}
              </dl>
            </FieldSet>
          )}
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
