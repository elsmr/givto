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

/** A price or a range ("from … up to …"), typed in major units and stored in cents. */
export const WishPriceFields = ({ id, draft, update }: WishPriceFieldsProps) => {
  const t = useTranslations('wishlist.form');
  // Keep a currency the import brought in, even if it's not in our short list.
  const currencies = CURRENCIES.includes(draft.currency) ? CURRENCIES : [draft.currency, ...CURRENCIES];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_auto]">
      <Field>
        <FieldLabel htmlFor={`${id}-price`}>{t('price-from')}</FieldLabel>
        <Input
          id={`${id}-price`}
          type="number"
          inputMode="decimal"
          min={0}
          step={0.01}
          value={draft.priceFrom}
          onChange={(event) => update({ priceFrom: event.target.value })}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${id}-price-to`}>{t('price-to')}</FieldLabel>
        <Input
          id={`${id}-price-to`}
          type="number"
          inputMode="decimal"
          min={draft.priceFrom || 0}
          step={0.01}
          value={draft.priceTo}
          onChange={(event) => update({ priceTo: event.target.value })}
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
