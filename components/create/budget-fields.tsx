import { Field, FieldDescription, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { useTranslations } from 'next-intl';
import type { CreateDraft } from './use-create-draft';

const currencies = ['EUR', 'USD', 'GBP', 'CHF', 'SEK', 'DKK', 'NOK', 'PLN'];

type BudgetFieldsProps = {
  draft: CreateDraft;
  onChange: (patch: Partial<CreateDraft>) => void;
};

/** Optional budget (51): one amount, or a range with "up to". */
export const BudgetFields = ({ draft, onChange }: BudgetFieldsProps) => {
  const t = useTranslations('create.details.budget');

  return (
    <FieldSet>
      <FieldLegend>{t('legend')}</FieldLegend>
      <FieldDescription>{t('help')}</FieldDescription>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-[1fr_1fr_auto]">
        <Field>
          <FieldLabel htmlFor="budget-amount">{t('amount')}</FieldLabel>
          <Input
            id="budget-amount"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={draft.budgetAmount}
            onChange={(event) => onChange({ budgetAmount: event.target.value })}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="budget-max">{t('max')}</FieldLabel>
          <Input
            id="budget-max"
            type="number"
            inputMode="decimal"
            min={draft.budgetAmount || 0}
            step="0.01"
            disabled={!draft.budgetAmount}
            value={draft.budgetMax}
            onChange={(event) => onChange({ budgetMax: event.target.value })}
          />
        </Field>
        <Field className="col-span-2 sm:col-span-1">
          <FieldLabel htmlFor="budget-currency">{t('currency')}</FieldLabel>
          <NativeSelect
            id="budget-currency"
            value={draft.currency}
            onChange={(event) => onChange({ currency: event.target.value })}
          >
            {currencies.map((currency) => (
              <NativeSelectOption key={currency} value={currency}>
                {currency}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      </div>
    </FieldSet>
  );
};
