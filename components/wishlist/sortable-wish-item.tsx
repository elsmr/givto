import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDivider } from '@/components/ui/card';
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
import { WishImage } from './wish-image';
import { WishMoveButtons } from './wish-move-buttons';
import { WishDetails } from './wish-summary';

interface SortableWishItemProps {
  wish: WishView;
  index: number;
  count: number;
  onMove: (toIndex: number) => void;
}

/** One wish as a card: picture on top, the wish, then reorder / edit / delete. */
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
    <li ref={rowRef} className={cn(dragging && 'opacity-50', over && 'outline-3 outline-offset-3 outline-primary')}>
      <Card size="sm">
        {editing ? (
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
        ) : (
          <>
            {wish.imageId && (
              <>
                <CardContent className="flex justify-center">
                  <WishImage imageId={wish.imageId} alt={t('form.image-alt', { title: wish.title })} size={160} />
                </CardContent>
                <CardDivider />
              </>
            )}
            <CardContent className="flex gap-3">
              <span className="font-heading text-3xl leading-none font-extrabold tabular-nums" aria-hidden="true">
                {index + 1}
              </span>
              <WishDetails wish={wish} />
            </CardContent>
            <CardDivider />
            <CardContent className="flex items-center gap-1">
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
            </CardContent>
          </>
        )}
      </Card>
    </li>
  );
};
