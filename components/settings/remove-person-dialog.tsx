import { DrawError } from '@/components/draw/draw-error';
import type { GroupMember } from '@/components/group/group-data';
import { appErrorCode } from '@/components/group/app-error-code';
import { useRefreshEdition } from '@/components/draw/use-refresh-edition';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { useTRPC } from '@/lib/client/trpc';
import type { EditionStatus } from '@/lib/schema/edition';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { settingsErrorKey } from './settings-error';

type RemovePersonDialogProps = { groupSlug: string; person: GroupMember; editionStatus: EditionStatus; members: GroupMember[] };

/**
 * Organizer removes someone (27). After the draw only their Santa gets someone new (48), unless the names have to be
 * drawn again for everyone (105: said before confirming; refused with the reason when no draw works without them).
 * From gift day on nobody gets someone new.
 */
export const RemovePersonDialog = ({ groupSlug, person, editionStatus, members }: RemovePersonDialogProps) => {
  const t = useTranslations('settings');
  const trpc = useTRPC();
  const refresh = useRefreshEdition(groupSlug);
  const [open, setOpen] = useState(false);
  const drawn = editionStatus === 'drawn';
  const effect = useQuery(trpc.settings.removalEffect.queryOptions({ groupSlug, memberId: person.id }, { enabled: open && drawn }));
  const remove = useMutation(
    trpc.settings.removePerson.mutationOptions({
      onSuccess: () => {
        toast.add({ title: t('people.removed', { name: person.name }), type: 'success' });
        void refresh();
      },
    })
  );
  const description =
    editionStatus === 'giftday'
      ? 'remove-giftday'
      : !drawn || effect.data === 'none'
        ? 'remove-before'
        : effect.data === 'redraw'
          ? 'remove-redraw'
          : 'remove-after';
  const drawRefused = remove.error && ['DRAW_IMPOSSIBLE', 'TOO_FEW_PEOPLE'].includes(appErrorCode(remove.error));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="neutral" size="sm" />}>{t('people.remove')}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('people.remove-title', { name: person.name })}</DialogTitle>
          <DialogDescription>{t(`people.${description}`, { name: person.name })}</DialogDescription>
        </DialogHeader>
        {remove.error &&
          (drawRefused ? (
            <DrawError error={remove.error} members={members} />
          ) : (
            <p role="alert" className="text-danger">
              {t(`errors.${settingsErrorKey(remove.error)}`)}
            </p>
          ))}
        <DialogFooter>
          <DialogClose render={<Button variant="neutral" />}>{t('people.cancel')}</DialogClose>
          <Button
            variant="danger"
            disabled={remove.isPending || (drawn && effect.isPending)}
            onClick={() => remove.mutate({ groupSlug, memberId: person.id })}
          >
            {t('people.remove-confirm', { name: person.name })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
