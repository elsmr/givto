import { Field, FieldDescription, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { ExchangeMode } from '@/lib/schema/group';
import { useTranslations } from 'next-intl';
import type { EditionDetailsDraft } from './use-create-draft';

type GiftDayFieldsProps = {
  draft: EditionDetailsDraft;
  today: string;
  onChange: (patch: Partial<EditionDetailsDraft>) => void;
};

/** Gift day (28): optional date and time, plus how gifts change hands. */
export const GiftDayFields = ({ draft, today, onChange }: GiftDayFieldsProps) => {
  const t = useTranslations('create.details');

  return (
    <>
      <FieldSet>
        <FieldLegend>{t('gift-day.legend')}</FieldLegend>
        <FieldDescription>{t('gift-day.help')}</FieldDescription>
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="gift-date">{t('gift-day.date')}</FieldLabel>
            <Input
              id="gift-date"
              type="date"
              min={today}
              value={draft.giftDate}
              onChange={(event) => onChange({ giftDate: event.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="gift-time">{t('gift-day.time')}</FieldLabel>
            <Input
              id="gift-time"
              type="time"
              disabled={!draft.giftDate}
              value={draft.giftTime}
              onChange={(event) => onChange({ giftTime: event.target.value })}
            />
          </Field>
        </div>
      </FieldSet>
      <Field>
        <FieldLabel htmlFor="exchange-mode">{t('exchange.label')}</FieldLabel>
        <NativeSelect
          id="exchange-mode"
          className="w-full"
          value={draft.exchangeMode}
          onChange={(event) => onChange({ exchangeMode: event.target.value as EditionDetailsDraft['exchangeMode'] })}
        >
          {ExchangeMode.options.map((mode) => (
            <NativeSelectOption key={mode} value={mode}>
              {t(`exchange.${mode}`)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
    </>
  );
};
