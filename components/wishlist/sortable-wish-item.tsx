import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { WishCard } from './wish-card';
import { WishForm } from './wish-form';
import { WishMoveButtons } from './wish-move-buttons';

interface SortableWishItemProps {
  wish: WishView;
  index: number;
  count: number;
  onMove: (toIndex: number) => void;
}

/** One of my wishes: its card with reorder / edit / delete, or the edit form. */
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
    <li ref={rowRef} className={cn(dragging && 'opacity-50', over && 'outline-3 outline-offset-3 outline-focus')}>
      {editing ? (
        <Card size="sm">
          <CardContent>
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
          </CardContent>
        </Card>
      ) : (
        <WishCard wish={wish} position={index + 1}>
          <div className="flex items-center gap-1">
            {/* Pointer only; keyboard users have the move buttons. */}
            <div
              ref={handleRef}
              title={t('item.drag', { title: wish.title })}
              className="grid size-11 cursor-grab place-items-center text-muted sm:size-9"
            >
              <GripVertical aria-hidden="true" className="size-5" />
            </div>
            <WishMoveButtons wish={wish} index={index} count={count} onMove={onMove} />
            <Button
              ref={editButton}
              variant="neutral"
              size="icon-sm"
              className="ml-auto"
              aria-label={t('item.edit', { title: wish.title })}
              onClick={() => setEditing(true)}
            >
              <Pencil aria-hidden="true" />
            </Button>
            <Button
              variant="danger"
              size="icon-sm"
              className="ml-2"
              aria-label={t('item.delete', { title: wish.title })}
              disabled={remove.isPending}
              onClick={deleteWish}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
        </WishCard>
      )}
    </li>
  );
};
