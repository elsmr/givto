import { BudgetFields } from '@/components/create/budget-fields';
import { GiftDayFields } from '@/components/create/gift-day-fields';
import { fieldIssue, type FieldIssue } from '@/components/group/field-issue';
import type { GroupEdition } from '@/components/group/group-data';
import { useRefreshEdition } from '@/components/draw/use-refresh-edition';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { IconCardTitle } from '@/components/ui/icon-card-title';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { useTRPC } from '@/lib/client/trpc';
import { todayIn } from '@/lib/local-date';
import { EditionTitle, GiftDay, isBeforeDraw } from '@/lib/schema/edition';
import { useMutation } from '@tanstack/react-query';
import { CalendarDays } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { draftFromEdition, toEditionInput, type EditionDraft } from './edition-draft';
import { EditionDatesFields } from './edition-dates-fields';
import { settingsErrorKey } from './settings-error';

/** Edition title, gift day, dates, exchange, budget, notes, "not the same as last time" (28, 33). */
export const EditionForm = ({ groupSlug, edition }: { groupSlug: string; edition: GroupEdition }) => {
  const t = useTranslations('settings');
  const tIssues = useTranslations('group.issues');
  const trpc = useTRPC();
  const refresh = useRefreshEdition(groupSlug);
  const [draft, setDraft] = useState(() => draftFromEdition(edition));
  const [issues, setIssues] = useState<{ title: FieldIssue | null; place: FieldIssue | null }>({ title: null, place: null });
  const save = useMutation(
    trpc.settings.updateEdition.mutationOptions({
      onSuccess: () => {
        toast.add({ title: t('saved'), type: 'success' });
        void refresh();
      },
    })
  );
  const update = (patch: Partial<EditionDraft>) => setDraft((current) => ({ ...current, ...patch }));
  const beforeDraw = isBeforeDraw(edition);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = {
      title: fieldIssue(EditionTitle, draft.title),
      place: draft.giftDate && draft.place.trim() ? fieldIssue(GiftDay.entries.place, draft.place) : null,
    };
    setIssues(next);
    if (!next.title && !next.place) save.mutate(toEditionInput(draft, groupSlug, edition.number));
  };

  return (
    <Card>
      <CardHeader>
        <IconCardTitle icon={CalendarDays} tone="mint">
          {t('edition.title', { edition: edition.title })}
        </IconCardTitle>
      </CardHeader>
      <CardContent>
        {edition.status === 'done' ? (
          <p>{t('edition.done')}</p>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-8">
            <FieldGroup>
              <Field data-invalid={issues.title ? 'true' : undefined}>
                <FieldLabel htmlFor="edition-title">{t('edition.name')}</FieldLabel>
                <Input id="edition-title" required maxLength={80} value={draft.title} onChange={(event) => update({ title: event.target.value })} />
                {issues.title && <FieldError>{tIssues(issues.title)}</FieldError>}
              </Field>
              <GiftDayFields draft={draft} today={todayIn(edition.timeZone)} placeIssue={issues.place} onChange={update} />
              <EditionDatesFields draft={draft} today={todayIn(edition.timeZone)} canSchedule={beforeDraw} onChange={update} />
              <BudgetFields draft={draft} onChange={update} />
              <Field>
                <FieldLabel htmlFor="edition-notes">{t('edition.notes')}</FieldLabel>
                <Textarea id="edition-notes" maxLength={2000} value={draft.notes} onChange={(event) => update({ notes: event.target.value })} />
                <FieldDescription>{t('edition.notes-help')}</FieldDescription>
              </Field>
              {edition.hasPreviousEdition && beforeDraw && (
                <Field orientation="horizontal">
                  <Switch
                    id="avoid-previous"
                    checked={draft.avoidPreviousGiftees}
                    onCheckedChange={(checked) => update({ avoidPreviousGiftees: checked })}
                  />
                  <div className="flex flex-col gap-1">
                    <FieldLabel htmlFor="avoid-previous">{t('edition.avoid-previous')}</FieldLabel>
                    <FieldDescription>{t('edition.avoid-previous-help')}</FieldDescription>
                  </div>
                </Field>
              )}
            </FieldGroup>
            {save.error && <FieldError>{t(`errors.${settingsErrorKey(save.error)}`)}</FieldError>}
            <Button type="submit" size="lg" className="self-start" disabled={save.isPending}>
              {t('save')}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
};
