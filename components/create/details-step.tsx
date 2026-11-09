import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { todayIn } from '@/lib/local-date';
import { GiftDay } from '@/lib/schema/edition';
import { GroupName } from '@/lib/schema/group';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { fieldIssue, type FieldIssue } from '../group/field-issue';
import { BudgetFields } from './budget-fields';
import { GiftDayFields } from './gift-day-fields';
import type { CreateDraft } from './use-create-draft';

type DetailsStepProps = {
  draft: CreateDraft;
  timeZone: string;
  onChange: (patch: Partial<CreateDraft>) => void;
  onNext: () => void;
};

/** Step 1: name the Secret Santa; gift day and budget are optional. */
export const DetailsStep = ({ draft, timeZone, onChange, onNext }: DetailsStepProps) => {
  const t = useTranslations('create.details');
  const tIssues = useTranslations('group.issues');
  const [issues, setIssues] = useState<{ name: FieldIssue | null; place: FieldIssue | null }>({ name: null, place: null });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = {
      name: fieldIssue(GroupName, draft.name),
      place: draft.giftDate && draft.place.trim() ? fieldIssue(GiftDay.entries.place, draft.place) : null,
    };
    setIssues(next);
    if (!next.name && !next.place) onNext();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-8">
      <FieldGroup>
        <Field data-invalid={issues.name ? 'true' : undefined}>
          <FieldLabel htmlFor="group-name">{t('name')}</FieldLabel>
          <Input
            id="group-name"
            required
            maxLength={80}
            autoFocus
            placeholder={t('name-placeholder')}
            value={draft.name}
            aria-invalid={issues.name ? 'true' : undefined}
            aria-describedby="group-name-help"
            onChange={(event) => onChange({ name: event.target.value })}
          />
          <FieldDescription id="group-name-help">{t('name-help')}</FieldDescription>
          {issues.name && <FieldError>{tIssues(issues.name)}</FieldError>}
        </Field>
        <GiftDayFields draft={draft} today={todayIn(timeZone)} placeIssue={issues.place} onChange={onChange} />
        <BudgetFields draft={draft} onChange={onChange} />
      </FieldGroup>
      <Button type="submit" size="lg" className="self-start">
        {t('next')}
      </Button>
    </form>
  );
};
