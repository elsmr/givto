import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { useFocusAfterEdit } from '@/lib/client/use-focus-after-edit';
import { cn } from '@/lib/utils';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useErrorMessage } from './use-error-message';
import { useSortableWish } from './use-sortable-wish';
import { useWishMutations } from './use-wish-mutations';
import { draftFromWish, type WishView } from './wish-draft';
import { WishForm } from './wish-form';
import { WishSummary } from './wish-summary';
import { WishMoveButtons } from './wish-move-buttons';

interface SortableWishItemProps {
  wish: WishView;
  index: number;
  count: number;
  onMove: (toIndex: number) => void;
}

export const SortableWishItem = ({ wish, index, count, onMove }: SortableWishItemProps) => {
  const t = useTranslations('wishlist');
  const errorMessage = useErrorMessage();
  const { update, remove } = useWishMutations();
  const [editing, setEditing] = useState(false);
  const editButton = useFocusAfterEdit(editing);
  const { rowRef, handleRef, dragging, over } = useSortableWish(wish.id, index, !editing);

  const deleteWish = () =>
    remove.mutate(
      { wishId: wish.id },
      {
        onSuccess: () => toast.add({ title: t('item.deleted', { title: wish.title }), type: 'success' }),
        onError: (error) => toast.add({ title: errorMessage(error), type: 'error' }),
      }
    );

  return (
    <li
      ref={rowRef}
      className={cn(
        'flex gap-2 bg-surface p-3 shadow-md bordered sm:gap-4 sm:p-4',
        dragging && 'opacity-50',
        over && 'outline-3 outline-offset-3 outline-focus'
      )}
    >
      <div className="flex flex-col items-center gap-1">
        <span className="font-heading text-lg font-extrabold" aria-hidden="true">
          {index + 1}
        </span>
        {/* Pointer only; keyboard users have the move buttons. */}
        {!editing && (
          <div ref={handleRef} title={t('item.drag', { title: wish.title })} className="cursor-grab p-1.5 text-muted">
            <GripVertical aria-hidden="true" className="size-5" />
          </div>
        )}
      </div>
      {editing ? (
        <div className="min-w-0 flex-1">
          <WishForm
            initial={draftFromWish(wish)}
            submitLabel={t('form.save')}
            busy={update.isPending}
            error={update.error ? errorMessage(update.error) : undefined}
            onSubmit={(input) =>
              update.mutate({ wishId: wish.id, ...input }, { onSuccess: () => setEditing(false) })
            }
            onCancel={() => setEditing(false)}
            autoFocus
          />
        </div>
      ) : (
        <>
          <WishSummary wish={wish} />
          <div className="grid h-fit grid-cols-2 gap-2">
            <WishMoveButtons wish={wish} index={index} count={count} onMove={onMove} />
            <Button ref={editButton} variant="neutral" size="icon-sm" className="col-start-2 row-start-1" aria-label={t('item.edit', { title: wish.title })} onClick={() => setEditing(true)}>
              <Pencil aria-hidden="true" />
            </Button>
            <Button variant="danger" size="icon-sm" className="col-start-2 row-start-2" aria-label={t('item.delete', { title: wish.title })} disabled={remove.isPending} onClick={deleteWish}>
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
        </>
      )}
    </li>
  );
};
