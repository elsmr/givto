import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { todayIn } from '@/lib/local-date';
import { GroupName } from '@/lib/schema/group';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { fieldIssue, type FieldIssue } from '../group/field-issue';
import { BudgetFields } from './budget-fields';
import { ExchangeField, GiftDayFields, KindField } from './gift-day-fields';
import type { CreateDraft } from './use-create-draft';

type DetailsStepProps = {
  draft: CreateDraft;
  timeZone: string;
  onChange: (patch: Partial<CreateDraft>) => void;
  submitLabel: string;
  busy: boolean;
  onNext: () => void;
};

/**
 * Step 1: what kind (88) and its name. Gift day is optional; time, budget and posting only show when asked for.
 * A white elephant is played together, so it doesn't ask about posting.
 */
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
        <KindField kind={draft.kind} onChange={(kind) => onChange({ kind })} />
        <Field data-invalid={nameIssue ? 'true' : undefined}>
          <FieldLabel htmlFor="group-name">{draft.kind === 'whiteElephant' ? t('name-white-elephant') : t('name')}</FieldLabel>
          <Input
            id="group-name"
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            data-bwignore
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
        {draft.kind !== 'whiteElephant' && <ExchangeField draft={draft} onChange={onChange} />}
      </FieldGroup>
      <Button type="submit" size="lg" className="xs:self-start" disabled={busy}>
        {submitLabel}
      </Button>
    </form>
  );
};
