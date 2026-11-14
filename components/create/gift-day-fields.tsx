import { Button } from '@/components/ui/button';
import { Field, FieldHint, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { EditionKind } from '@/lib/schema/edition';
import { ExchangeMode } from '@/lib/schema/group';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ConspiracyAnimation } from './explainers/conspiracy';
import { SecretSantaAnimation } from './explainers/secret-santa';
import { WhiteElephantAnimation } from './explainers/white-elephant';
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
      <button type="button" className="w-fit text-sm text-muted underline underline-offset-4 hover:text-ink" onClick={() => setAsked(true)}>
        {t('ask')}
      </button>
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

const animations = { secretSanta: SecretSantaAnimation, whiteElephant: WhiteElephantAnimation, conspiracy: ConspiracyAnimation };

/** Secret Santa, white elephant or Conspiracy Santa (88), each explained behind its (?); the settings show it until names are drawn or it's locked in. */
export const KindField = ({ kind, onChange }: { kind: EditionKind; onChange: (kind: EditionKind) => void }) => {
  const t = useTranslations('create.details.kind');

  return (
    <FieldSet className="gap-2">
      <FieldLegend variant="label">{t('label')}</FieldLegend>
      <div className="flex flex-col gap-1">
        {EditionKind.options.map((option) => {
          const Animation = animations[option];
          return (
            <div key={option} className="flex items-center gap-2">
              <label className="flex min-h-11 items-center gap-2 font-semibold">
                <input
                  type="radio"
                  name="edition-kind"
                  value={option}
                  checked={kind === option}
                  onChange={() => onChange(option)}
                  className="size-5 accent-primary"
                />
                {t(option)}
              </label>
              <FieldHint label={t('about', { name: t(option) })}>
                <div className="flex flex-col gap-3">
                  <Animation />
                  <p>{t(`explain.${option}`)}</p>
                </div>
              </FieldHint>
            </div>
          );
        })}
      </div>
    </FieldSet>
  );
};
