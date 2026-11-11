import { BudgetFields } from '@/components/create/budget-fields';
import { ExchangeField, GiftDayFields } from '@/components/create/gift-day-fields';
import { fieldIssue, type FieldIssue } from '@/components/group/field-issue';
import type { GroupEdition } from '@/components/group/group-data';
import { useRefreshEdition } from '@/components/draw/use-refresh-edition';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { useTRPC } from '@/lib/client/trpc';
import { todayIn } from '@/lib/local-date';
import { EditionTitle, isBeforeDraw } from '@/lib/schema/edition';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { draftFromEdition, toEditionInput, type EditionDraft } from './edition-draft';
import { EditionDatesFields } from './edition-dates-fields';
import { settingsErrorKey } from './settings-error';

/** Edition title, gift day, dates, exchange, budget, notes (28). */
export const EditionForm = ({ groupSlug, edition }: { groupSlug: string; edition: GroupEdition }) => {
  const t = useTranslations('settings');
  const tIssues = useTranslations('group.issues');
  const trpc = useTRPC();
  const refresh = useRefreshEdition(groupSlug);
  const [draft, setDraft] = useState(() => draftFromEdition(edition));
  const [titleIssue, setTitleIssue] = useState<FieldIssue | null>(null);
  const save = useMutation(
    trpc.settings.updateEdition.mutationOptions({
      onSuccess: () => {
        toast.add({ title: t('saved'), type: 'success' });
        void refresh();
      },
    })
  );
  const update = (patch: Partial<EditionDraft>) => setDraft((current) => ({ ...current, ...patch }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const issue = fieldIssue(EditionTitle, draft.title);
    setTitleIssue(issue);
    if (!issue) save.mutate(toEditionInput(draft, groupSlug, edition.number));
  };

  return edition.status === 'done' ? (
    <p>{t('edition.done')}</p>
  ) : (
    <form onSubmit={submit} className="flex flex-col gap-8">
      <FieldGroup>
        <Field data-invalid={titleIssue ? 'true' : undefined}>
          <FieldLabel htmlFor="edition-title">{t('edition.name')}</FieldLabel>
          <Input id="edition-title" required maxLength={80} value={draft.title} onChange={(event) => update({ title: event.target.value })} />
          {titleIssue && <FieldError>{tIssues(titleIssue)}</FieldError>}
        </Field>
        <GiftDayFields draft={draft} today={todayIn(edition.timeZone)} onChange={update} />
        <ExchangeField draft={draft} onChange={update} />
        <EditionDatesFields draft={draft} today={todayIn(edition.timeZone)} canSchedule={isBeforeDraw(edition)} onChange={update} />
        <BudgetFields draft={draft} onChange={update} />
        <Field>
          <FieldLabel htmlFor="edition-notes">{t('edition.notes')}</FieldLabel>
          <Textarea id="edition-notes" maxLength={2000} value={draft.notes} onChange={(event) => update({ notes: event.target.value })} />
          <FieldDescription>{t('edition.notes-help')}</FieldDescription>
        </Field>
      </FieldGroup>
      {save.error && <FieldError>{t(`errors.${settingsErrorKey(save.error)}`)}</FieldError>}
      <Button type="submit" size="lg" className="self-start" disabled={save.isPending}>
        {t('save')}
      </Button>
    </form>
  );
};
