import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { useTranslations } from 'next-intl';
import type { WishDraft } from './wish-draft';

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'SEK', 'DKK', 'NOK', 'PLN'];

interface WishPriceFieldsProps {
  id: string;
  draft: WishDraft;
  update: (changes: Partial<WishDraft>) => void;
}

/** One price, typed in major units and stored in cents. */
export const WishPriceFields = ({ id, draft, update }: WishPriceFieldsProps) => {
  const t = useTranslations('wishlist.form');
  // Keep a currency the import brought in, even if it's not in our short list.
  const currencies = CURRENCIES.includes(draft.currency) ? CURRENCIES : [draft.currency, ...CURRENCIES];

  return (
    <div className="grid grid-cols-[1fr_auto] gap-3">
      <Field>
        <FieldLabel htmlFor={`${id}-price`}>{t('price')}</FieldLabel>
        <Input
          id={`${id}-price`}
          type="number"
          inputMode="decimal"
          min={0}
          step={0.01}
          value={draft.price}
          onChange={(event) => update({ price: event.target.value })}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${id}-currency`}>{t('currency')}</FieldLabel>
        <NativeSelect
          id={`${id}-currency`}
          value={draft.currency}
          onChange={(event) => update({ currency: event.target.value })}
        >
          {currencies.map((currency) => (
            <NativeSelectOption key={currency} value={currency}>
              {currency}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
    </div>
  );
};
