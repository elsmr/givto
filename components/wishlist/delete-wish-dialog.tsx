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
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useErrorMessage } from './use-error-message';
import { useWishMutations } from './use-wish-mutations';

/** "Delete for good" on an archived wish, after a confirm: the wish and its pictures are gone. */
export const DeleteWishDialog = ({ wishId, title }: { wishId: string; title: string }) => {
  const t = useTranslations('wishlist');
  const errorMessage = useErrorMessage();
  const { remove } = useWishMutations();

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="danger" size="sm" aria-label={t('archive.delete-label', { title })} />}>
        <Trash2 aria-hidden="true" />
        {t('archive.delete')}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('archive.delete-title', { title })}</DialogTitle>
          <DialogDescription>{t('archive.delete-description')}</DialogDescription>
        </DialogHeader>
        {remove.error && (
          <p role="alert" className="text-danger">
            {errorMessage(remove.error)}
          </p>
        )}
        <DialogFooter>
          <DialogClose render={<Button variant="neutral" />}>{t('archive.cancel')}</DialogClose>
          <Button
            variant="danger"
            disabled={remove.isPending}
            onClick={() =>
              remove.mutate({ wishId }, { onSuccess: () => toast.add({ title: t('item.deleted', { title }), type: 'success' }) })
            }
          >
            {t('archive.delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
