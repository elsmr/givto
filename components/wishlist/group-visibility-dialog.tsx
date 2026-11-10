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
import { EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ShowWishSwitch } from './show-wish-switch';
import type { WishView } from './wish-draft';

type GroupVisibilityDialogProps = { groupSlug: string; wishes: (WishView & { shown: boolean; alsoIn: { name: string }[] })[] };

/** "Edit what this group sees" (61): the per-group show switches, out of the way in a dialog. Each switch saves on its own. */
export const GroupVisibilityDialog = ({ groupSlug, wishes }: GroupVisibilityDialogProps) => {
  const t = useTranslations('wishlist.group');

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="neutral" />}>
        <EyeOff aria-hidden="true" />
        {t('visibility')}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('visibility')}</DialogTitle>
          <DialogDescription>{t('visibility-description')}</DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col divide-y-2 divide-dashed divide-ink/30">
          {wishes.map((wish) => (
            <li key={wish.id} className="flex flex-col gap-2 py-3">
              <span className="font-semibold break-words">{wish.title}</span>
              <ShowWishSwitch groupSlug={groupSlug} wish={wish} />
            </li>
          ))}
        </ul>
        <DialogFooter>
          <DialogClose render={<Button />}>{t('done')}</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
