import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useTranslations } from 'next-intl';
import { useId, useState, type FormEvent } from 'react';

export interface TipDraft {
  aboutMemberId: string;
  text: string;
  anonymous: boolean;
}

interface TipFormProps {
  initial: TipDraft;
  /** Shown when writing a new tip; editing keeps who it's about. */
  people?: { memberId: string; name: string }[];
  submitLabel: string;
  busy: boolean;
  error?: string;
  onSubmit: (draft: TipDraft) => void;
  onCancel?: () => void;
}

/** Write or edit a tip: who it's about, the text, and "post anonymously". */
export const TipForm = ({ initial, people, submitLabel, busy, error, onSubmit, onCancel }: TipFormProps) => {
  const t = useTranslations('between.tips');
  const id = useId();
  const [draft, setDraft] = useState(initial);
  const update = (changes: Partial<TipDraft>) => setDraft((current) => ({ ...current, ...changes }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(draft);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {people && (
        <Field>
          <FieldLabel htmlFor={`${id}-about`}>{t('about')}</FieldLabel>
          <NativeSelect
            id={`${id}-about`}
            className="w-full"
            required
            value={draft.aboutMemberId}
            onChange={(event) => update({ aboutMemberId: event.target.value })}
          >
            <NativeSelectOption value="" disabled>
              {t('about-placeholder')}
            </NativeSelectOption>
            {people.map((person) => (
              <NativeSelectOption key={person.memberId} value={person.memberId}>
                {person.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      )}
      <Field>
        <FieldLabel htmlFor={`${id}-text`}>{t('text')}</FieldLabel>
        <Textarea
          id={`${id}-text`}
          required
          maxLength={1000}
          placeholder={t('text-placeholder')}
          value={draft.text}
          onChange={(event) => update({ text: event.target.value })}
        />
      </Field>
      <div className="flex flex-col gap-1">
        <Field orientation="horizontal" className="w-fit">
          <Switch
            id={`${id}-anonymous`}
            size="sm"
            aria-describedby={`${id}-anonymous-hint`}
            checked={draft.anonymous}
            onCheckedChange={(anonymous) => update({ anonymous })}
          />
          <FieldLabel htmlFor={`${id}-anonymous`}>{t('anonymous')}</FieldLabel>
        </Field>
        <FieldDescription id={`${id}-anonymous-hint`}>{t('anonymous-hint')}</FieldDescription>
      </div>
      {error && <Alert variant="danger">{error}</Alert>}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={busy}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="neutral" onClick={onCancel}>
            {t('cancel')}
          </Button>
        )}
      </div>
    </form>
  );
};
