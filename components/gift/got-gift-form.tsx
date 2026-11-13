import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import type { RouterOutputs } from '@/lib/client/trpc';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { GiftLines } from './gift-lines';

type GifteeWishlist = NonNullable<RouterOutputs['claim']['gifteeWishlist']>;
export type GiftDraft = { wishIds: string[]; lines: string[] };

type GotGiftFormProps = {
  list: GifteeWishlist;
  initial: GiftDraft;
  busy: boolean;
  onSubmit: (draft: GiftDraft) => void;
};

/** Tick the wishes you bought (Dibs! ones start ticked) and add the rest as short lines (63). */
export const GotGiftForm = ({ list, initial, busy, onSubmit }: GotGiftFormProps) => {
  const t = useTranslations('wishlist.got-gift');
  const tGiftee = useTranslations('wishlist.giftee');
  const id = useId();
  const [wishIds, setWishIds] = useState(initial.wishIds);
  const [lines, setLines] = useState(initial.lines);
  const { giftee, wishes } = list;
  const toggle = (wishId: string, checked: boolean) =>
    setWishIds((ids) => (checked ? [...ids, wishId] : ids.filter((other) => other !== wishId)));

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ wishIds, lines });
      }}
    >
      <FieldSet>
        <FieldLegend>{t('wishes', { name: giftee.name })}</FieldLegend>
        {wishes.length === 0 ? (
          <p className="text-muted">{t('no-wishes', { name: giftee.name })}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {wishes.map((wish) => (
              <li key={wish.id}>
                <Field orientation="horizontal" data-disabled={wish.claim === 'taken' || undefined}>
                  <Checkbox
                    id={`${id}-${wish.id}`}
                    checked={wishIds.includes(wish.id)}
                    disabled={wish.claim === 'taken'}
                    onCheckedChange={(checked) => toggle(wish.id, checked)}
                  />
                  <FieldLabel htmlFor={`${id}-${wish.id}`} className="flex flex-wrap items-center gap-2 font-normal">
                    <span className="break-words">{wish.title}</span>
                    {wish.claim === 'taken' && <Badge>{t('taken')}</Badge>}
                    {wish.archived && <Badge>{tGiftee('gone')}</Badge>}
                  </FieldLabel>
                </Field>
              </li>
            ))}
          </ul>
        )}
      </FieldSet>
      <GiftLines lines={lines} onChange={setLines} />
      <Button type="submit" className="self-start" disabled={busy}>
        {t('save')}
      </Button>
    </form>
  );
};
