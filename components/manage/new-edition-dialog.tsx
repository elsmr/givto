import { useRefreshEdition } from '@/components/draw/use-refresh-edition';
import { knownAppError } from '@/components/group/app-error-code';
import type { GroupData, GroupEdition } from '@/components/group/group-data';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useTRPC } from '@/lib/client/trpc';
import { todayIn } from '@/lib/local-date';
import { defaultEditionTitle } from '@/lib/schema/edition';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/router';
import { useState } from 'react';

type NewEditionDialogProps = { group: GroupData; edition: GroupEdition; onClose: () => void };

/**
 * "Start a new edition?" (77): a draft named like the server would, renamable here; a drawn or gift
 * day edition is finished first. Then on to the settings to set it up.
 */
export const NewEditionDialog = ({ group, edition, onClose }: NewEditionDialogProps) => {
  const t = useTranslations('manage');
  const trpc = useTRPC();
  const router = useRouter();
  const refresh = useRefreshEdition(group.slug);
  const [title, setTitle] = useState(() =>
    defaultEditionTitle(Number(todayIn(edition.timeZone).slice(0, 4)), group.editions.map((e) => e.title))
  );
  const start = useMutation(
    trpc.edition.startNext.mutationOptions({
      onSuccess: async () => {
        await refresh();
        await router.push(`/g/${group.slug}/settings`);
      },
    })
  );
  const error = start.error && knownAppError(start.error, ['EDITION_IN_PROGRESS', 'EDITION_CHANGED'] as const);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            start.mutate({ groupSlug: group.slug, title: title.trim() });
          }}
        >
          <DialogHeader>
            <DialogTitle>{t('newEdition.title')}</DialogTitle>
            <DialogDescription>{t('newEdition.description', { title: edition.title })}</DialogDescription>
          </DialogHeader>
          {edition.status !== 'done' && <p>{t('newEdition.finish', { title: edition.title })}</p>}
          <Field>
            <FieldLabel htmlFor="new-edition-title">{t('newEdition.name')}</FieldLabel>
            <Input id="new-edition-title" required maxLength={80} value={title} onChange={(event) => setTitle(event.target.value)} />
          </Field>
          {error && <FieldError>{t(`errors.${error}`)}</FieldError>}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="neutral" />}>{t('cancel')}</DialogClose>
            <Button type="submit" disabled={start.isPending || !title.trim()}>
              {t('newEdition.confirm')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
