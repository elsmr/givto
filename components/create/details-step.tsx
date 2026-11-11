import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { todayIn } from '@/lib/local-date';
import { GroupName } from '@/lib/schema/group';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { fieldIssue, type FieldIssue } from '../group/field-issue';
import { BudgetFields } from './budget-fields';
import { ExchangeField, GiftDayFields } from './gift-day-fields';
import type { CreateDraft } from './use-create-draft';

type DetailsStepProps = {
  draft: CreateDraft;
  timeZone: string;
  onChange: (patch: Partial<CreateDraft>) => void;
  submitLabel: string;
  busy: boolean;
  onNext: () => void;
};

/** Step 1: name the Secret Santa. Gift day is optional; time, budget and posting only show when asked for. */
export const DetailsStep = ({ draft, timeZone, onChange, submitLabel, busy, onNext }: DetailsStepProps) => {
  const t = useTranslations('create.details');
  const tIssues = useTranslations('group.issues');
  const [nameIssue, setNameIssue] = useState<FieldIssue | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const issue = fieldIssue(GroupName, draft.name);
    setNameIssue(issue);
    if (!issue) onNext();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-8">
      <FieldGroup>
        <Field data-invalid={nameIssue ? 'true' : undefined}>
          <FieldLabel htmlFor="group-name">{t('name')}</FieldLabel>
          <Input
            id="group-name"
            required
            maxLength={80}
            autoFocus
            placeholder={t('name-placeholder')}
            value={draft.name}
            aria-invalid={nameIssue ? 'true' : undefined}
            onChange={(event) => onChange({ name: event.target.value })}
          />
          {nameIssue && <FieldError>{tIssues(nameIssue)}</FieldError>}
        </Field>
        <GiftDayFields draft={draft} today={todayIn(timeZone)} onChange={onChange} />
        <BudgetFields draft={draft} onChange={onChange} />
        <ExchangeField draft={draft} onChange={onChange} />
        <FieldDescription>{t('later')}</FieldDescription>
      </FieldGroup>
      <Button type="submit" size="lg" className="xs:self-start" disabled={busy}>
        {submitLabel}
      </Button>
    </form>
  );
};
