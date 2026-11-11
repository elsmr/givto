import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { EditionDetailsDraft } from './use-create-draft';

const currencies = ['EUR', 'USD', 'GBP', 'CHF', 'SEK', 'DKK', 'NOK', 'PLN'];

type BudgetFieldsProps = {
  draft: EditionDetailsDraft;
  onChange: (patch: Partial<EditionDetailsDraft>) => void;
};

/** Optional budget (51): "+ Budget" until asked for or set; one amount, or a range once "+ Range" is asked for. */
export const BudgetFields = ({ draft, onChange }: BudgetFieldsProps) => {
  const t = useTranslations('create.details.budget');
  const [asked, setAsked] = useState(false);
  const [rangeAsked, setRangeAsked] = useState(false);
  const range = rangeAsked || Boolean(draft.budgetMax);

  if (!asked && !draft.budgetAmount) {
    return (
      <Button type="button" variant="neutral" size="sm" className="w-fit" onClick={() => setAsked(true)}>
        <Plus aria-hidden="true" />
        {t('legend')}
      </Button>
    );
  }
  return (
    <FieldSet>
      <FieldLegend variant="label">{t('legend')}</FieldLegend>
      <FieldDescription>{t('help')}</FieldDescription>
      <div className="flex flex-wrap items-end gap-3">
        <Field className="w-28">
          <FieldLabel htmlFor="budget-amount" className={range ? undefined : 'sr-only'}>
            {t(range ? 'from' : 'amount')}
          </FieldLabel>
          <Input
            id="budget-amount"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            autoFocus={asked && !draft.budgetAmount}
            value={draft.budgetAmount}
            onChange={(event) => onChange({ budgetAmount: event.target.value })}
          />
        </Field>
        {range && (
          <Field className="w-28">
            <FieldLabel htmlFor="budget-max">{t('max')}</FieldLabel>
            <Input
              id="budget-max"
              type="number"
              inputMode="decimal"
              min={draft.budgetAmount || 0}
              step="0.01"
              autoFocus={rangeAsked && !draft.budgetMax}
              value={draft.budgetMax}
              onChange={(event) => onChange({ budgetMax: event.target.value })}
            />
          </Field>
        )}
        <Field className="w-fit">
          <FieldLabel htmlFor="budget-currency" className="sr-only">
            {t('currency')}
          </FieldLabel>
          <NativeSelect id="budget-currency" value={draft.currency} onChange={(event) => onChange({ currency: event.target.value })}>
            {currencies.map((currency) => (
              <NativeSelectOption key={currency} value={currency}>
                {currency}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        {!range && (
          <Button type="button" variant="ghost" size="sm" className="mb-0.5" onClick={() => setRangeAsked(true)}>
            <Plus aria-hidden="true" />
            {t('range')}
          </Button>
        )}
      </div>
    </FieldSet>
  );
};
