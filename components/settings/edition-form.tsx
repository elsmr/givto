import { BudgetFields } from '@/components/create/budget-fields';
import { ExchangeField, GiftDayFields, KindField } from '@/components/create/gift-day-fields';
import { fieldIssue, type FieldIssue } from '@/components/group/field-issue';
import type { GroupEdition } from '@/components/group/group-data';
import { useRefreshEdition } from '@/components/draw/use-refresh-edition';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { useTRPC } from '@/lib/client/trpc';
import { todayIn } from '@/lib/local-date';
import { HttpUrl } from '@/lib/schema/common';
import { drawsNames, EditionTitle, isBeforeDraw, titleForKind } from '@/lib/schema/edition';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import * as v from 'valibot';
import { draftFromEdition, toEditionInput, type EditionDraft } from './edition-draft';
import { EditionDatesFields } from './edition-dates-fields';
import { settingsErrorKey } from './settings-error';

/**
 * Edition title, kind until the draw (88), gift day, exchange and the call link by post (87), dates, budget, notes (28). A
 * white elephant has no exchange or dates but gift day. `takenTitles`: the group's other editions, to rename by kind.
 */
export const EditionForm = ({ groupSlug, edition, takenTitles }: { groupSlug: string; edition: GroupEdition; takenTitles: string[] }) => {
  const t = useTranslations('settings');
  const tIssues = useTranslations('group.issues');
  const trpc = useTRPC();
  const refresh = useRefreshEdition(groupSlug);
  const [draft, setDraft] = useState(() => draftFromEdition(edition));
  const [titleIssue, setTitleIssue] = useState<FieldIssue | null>(null);
  const [callUrlInvalid, setCallUrlInvalid] = useState(false);
  const [confirmingHideBoards, setConfirmingHideBoards] = useState(false);
  const save = useMutation(
    trpc.settings.updateEdition.mutationOptions({
      onSuccess: () => {
        toast.add({ title: t('saved'), type: 'success' });
        void refresh();
      },
    })
  );
  const update = (patch: Partial<EditionDraft>) => setDraft((current) => ({ ...current, ...patch }));
  const saveDraft = () => save.mutate(toEditionInput(draft, groupSlug, edition.number));
  // Posts on the boards (90) are kept, but nobody sees them until the kind is Conspiracy Santa again.
  const hidesBoards = edition.kind === 'conspiracy' && edition.status !== 'draft' && draft.kind !== 'conspiracy';

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const issue = fieldIssue(EditionTitle, draft.title);
    setTitleIssue(issue);
    // Only checked when it's sent: the form hides it, and leaves it out, unless gift day is by post.
    const callUrl = toEditionInput(draft, groupSlug, edition.number).giftDay?.callUrl;
    const callUrlBad = callUrl !== undefined && !v.is(HttpUrl, callUrl);
    setCallUrlInvalid(callUrlBad);
    if (issue || callUrlBad) return;
    if (hidesBoards) setConfirmingHideBoards(true);
    else saveDraft();
  };

  return edition.status === 'done' ? (
    <p>{t('edition.done')}</p>
  ) : (
    <form onSubmit={submit} className="flex flex-col gap-8">
      <FieldGroup>
        <Field data-invalid={titleIssue ? 'true' : undefined}>
          <FieldLabel htmlFor="edition-title">{t('edition.name')}</FieldLabel>
          <Input
            id="edition-title"
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            data-bwignore
            required
            maxLength={80}
            value={draft.title}
            onChange={(event) => update({ title: event.target.value })}
          />
          {titleIssue && <FieldError>{tIssues(titleIssue)}</FieldError>}
        </Field>
        {isBeforeDraw(edition) && (
          <KindField kind={draft.kind} onChange={(kind) => update({ kind, title: titleForKind(draft.title, draft.kind, kind, takenTitles) })} />
        )}
        <GiftDayFields draft={draft} today={todayIn(edition.timeZone)} onChange={update} />
        {drawsNames(draft) && <ExchangeField draft={draft} onChange={update} />}
        {drawsNames(draft) && draft.exchangeMode !== 'inPerson' && draft.giftDate && (
          <Field data-invalid={callUrlInvalid ? 'true' : undefined}>
            <FieldLabel htmlFor="edition-call-url" optional hint={t('edition.call-url-help')}>{t('edition.call-url')}</FieldLabel>
            <Input
              id="edition-call-url"
              type="url"
              inputMode="url"
              placeholder="https://"
              maxLength={2000}
              value={draft.callUrl}
              aria-invalid={callUrlInvalid ? 'true' : undefined}
              aria-describedby={callUrlInvalid ? 'edition-call-url-error' : undefined}
              onChange={(event) => update({ callUrl: event.target.value })}
            />
            {callUrlInvalid && <FieldError id="edition-call-url-error">{t('edition.call-url-invalid')}</FieldError>}
          </Field>
        )}
        {drawsNames(draft) && (
          <EditionDatesFields draft={draft} today={todayIn(edition.timeZone)} canSchedule={isBeforeDraw(edition)} onChange={update} />
        )}
        <BudgetFields draft={draft} onChange={update} />
        <Field>
          <FieldLabel htmlFor="edition-notes" optional hint={t('edition.notes-help')}>{t('edition.notes')}</FieldLabel>
          <Textarea id="edition-notes" maxLength={2000} value={draft.notes} onChange={(event) => update({ notes: event.target.value })} />
        </Field>
      </FieldGroup>
      {save.error && <FieldError>{t(`errors.${settingsErrorKey(save.error)}`)}</FieldError>}
      <Button type="submit" size="lg" className="self-start" disabled={save.isPending}>
        {t('save')}
      </Button>
      <Dialog open={confirmingHideBoards} onOpenChange={setConfirmingHideBoards}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('edition.hide-boards-title')}</DialogTitle>
            <DialogDescription>{t('edition.hide-boards-description')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="neutral" />}>{t('edition.hide-boards-cancel')}</DialogClose>
            <Button
              onClick={() => {
                setConfirmingHideBoards(false);
                saveDraft();
              }}
            >
              {t('edition.hide-boards-confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
};
