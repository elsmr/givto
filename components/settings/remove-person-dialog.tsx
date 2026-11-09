import type { GroupMember } from '@/components/group/group-data';
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
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { settingsErrorKey } from './settings-error';

type RemovePersonDialogProps = { groupSlug: string; person: GroupMember; drawn: boolean };

/** Organizer removes someone (27); after the draw only their Santa gets someone new (48). */
export const RemovePersonDialog = ({ groupSlug, person, drawn }: RemovePersonDialogProps) => {
  const t = useTranslations('settings');
  const trpc = useTRPC();
  const refresh = useRefreshEdition(groupSlug);
  const remove = useMutation(
    trpc.settings.removePerson.mutationOptions({
      onSuccess: () => {
        toast.add({ title: t('people.removed', { name: person.name }), type: 'success' });
        void refresh();
      },
    })
  );

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="ghost" size="sm" />}>{t('people.remove')}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('people.remove-title', { name: person.name })}</DialogTitle>
          <DialogDescription>
            {t(drawn ? 'people.remove-after' : 'people.remove-before', { name: person.name })}
          </DialogDescription>
        </DialogHeader>
        {remove.error && (
          <p role="alert" className="text-danger">
            {t(`errors.${settingsErrorKey(remove.error)}`)}
          </p>
        )}
        <DialogFooter>
          <DialogClose render={<Button variant="neutral" />}>{t('people.cancel')}</DialogClose>
          <Button
            variant="danger"
            disabled={remove.isPending}
            onClick={() => remove.mutate({ groupSlug, memberId: person.id })}
          >
            {t('people.remove-confirm', { name: person.name })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
