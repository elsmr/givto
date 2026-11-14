import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { EditionKind } from '@/lib/schema/edition';
import { ExchangeMode } from '@/lib/schema/group';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { EditionDetailsDraft } from './use-create-draft';

type FieldsProps = {
  draft: EditionDetailsDraft;
  onChange: (patch: Partial<EditionDetailsDraft>) => void;
};

/** Gift day (28): an optional date; the time only once asked for, or when there is one. */
export const GiftDayFields = ({ draft, today, onChange }: FieldsProps & { today: string }) => {
  const t = useTranslations('create.details.gift-day');
  const [timeAsked, setTimeAsked] = useState(false);

  return (
    <div className="flex items-end gap-3">
      <Field className="min-w-0 flex-1">
        <FieldLabel htmlFor="gift-date" optional>
          {t('legend')}
        </FieldLabel>
        <Input id="gift-date" type="date" min={today} value={draft.giftDate} onChange={(event) => onChange({ giftDate: event.target.value })} />
      </Field>
      {(timeAsked || draft.giftTime) && (
        <Field className="w-32 shrink-0">
          <FieldLabel htmlFor="gift-time">{t('time')}</FieldLabel>
          <Input
            id="gift-time"
            type="time"
            autoFocus={timeAsked && !draft.giftTime}
            disabled={!draft.giftDate}
            value={draft.giftTime}
            onChange={(event) => onChange({ giftTime: event.target.value })}
          />
        </Field>
      )}
      {!timeAsked && !draft.giftTime && draft.giftDate && (
        <Button type="button" variant="ghost" size="sm" className="mb-0.5" onClick={() => setTimeAsked(true)}>
          <Plus aria-hidden="true" />
          {t('time')}
        </Button>
      )}
    </div>
  );
};

/** How gifts change hands: in person unless said otherwise, so the choice only shows once asked for. */
export const ExchangeField = ({ draft, onChange }: FieldsProps) => {
  const t = useTranslations('create.details.exchange');
  const [asked, setAsked] = useState(false);

  if (!asked && draft.exchangeMode === 'inPerson') {
    return (
      <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => setAsked(true)}>
        {t('ask')}
      </Button>
    );
  }
  return (
    <Field>
      <FieldLabel htmlFor="exchange-mode">{t('label')}</FieldLabel>
      <NativeSelect
        id="exchange-mode"
        className="w-full"
        autoFocus={asked}
        value={draft.exchangeMode}
        onChange={(event) => onChange({ exchangeMode: event.target.value as EditionDetailsDraft['exchangeMode'] })}
      >
        {ExchangeMode.options.map((mode) => (
          <NativeSelectOption key={mode} value={mode}>
            {t(mode)}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </Field>
  );
};

/** Secret Santa or white elephant (88); the settings show it until names are drawn or it's locked in. */
export const KindField = ({ kind, onChange }: { kind: EditionKind; onChange: (kind: EditionKind) => void }) => {
  const t = useTranslations('create.details.kind');

  return (
    <Field>
      <FieldLabel htmlFor="edition-kind">{t('label')}</FieldLabel>
      <NativeSelect id="edition-kind" className="w-full" value={kind} onChange={(event) => onChange(event.target.value as EditionKind)}>
        {EditionKind.options.map((option) => (
          <NativeSelectOption key={option} value={option}>
            {t(option)}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </Field>
  );
};
