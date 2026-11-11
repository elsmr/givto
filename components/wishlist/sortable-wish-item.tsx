import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/components/ui/toast';
import { Tooltip, TooltipContent, TooltipTrigger, withTooltip } from '@/components/ui/tooltip';
import { useTRPCClient } from '@/lib/client/trpc';
import { useFocusAfterEdit } from '@/lib/client/use-focus-after-edit';
import { cn } from '@/lib/utils';
import { Archive, Check, GripVertical, Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
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
  /** Next to the badges, e.g. "Also in Work". */
  status?: ReactNode;
  /** More buttons before edit and archive, e.g. hide in this group. */
  actions?: ReactNode;
}

/** One of my wishes: its card with reorder / edit / got it / archive, or the edit form. */
export const SortableWishItem = ({ wish, index, count, onMove, status, actions }: SortableWishItemProps) => {
  const t = useTranslations('wishlist');
  const errorMessage = useErrorMessage();
  const client = useTRPCClient();
  const { update, archive, receive, refresh } = useWishMutations();
  const [editing, setEditing] = useState(false);
  const editButton = useFocusAfterEdit(editing);
  const { rowRef, handleRef, dragging, over } = useSortableWish(wish.id, index, !editing);

  const onError = (error: unknown) => toast.add({ title: errorMessage(error), type: 'error' });
  // The row is gone by the time someone clicks undo, so undo calls the client directly; onMove puts the wish back in its place.
  const undo = () =>
    client.wish.restore
      .mutate({ wishId: wish.id })
      .then(() => onMove(index))
      .then(refresh, onError);
  // Got it and archive both move the wish to the archive; restore undoes either.
  const moveOut = (done: string) => ({
    onSuccess: () => toast.add({ title: done, type: 'success', actionProps: { children: t('item.undo'), onClick: undo } }),
    onError,
  });
  const archiveWish = () => archive.mutate({ wishId: wish.id }, moveOut(t('item.archived', { title: wish.title })));
  const gotWish = () => receive.mutate({ wishId: wish.id, received: true }, moveOut(t('item.got-done', { title: wish.title })));

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
        <WishCard wish={wish} position={index + 1} status={status}>
          <div className="flex items-center gap-1">
            {/* Pointer only; keyboard users have the move buttons. */}
            <Tooltip>
              <TooltipTrigger
                render={<div ref={handleRef} data-slot="drag-handle" className="grid size-11 cursor-grab place-items-center text-muted sm:size-9" />}
              >
                <GripVertical aria-hidden="true" className="size-5" />
              </TooltipTrigger>
              <TooltipContent>{t('item.drag', { title: wish.title })}</TooltipContent>
            </Tooltip>
            <WishMoveButtons wish={wish} index={index} count={count} onMove={onMove} />
            <div className="ml-auto flex items-center gap-2">
              {actions}
              {withTooltip(
                t('item.edit', { title: wish.title }),
                <Button ref={editButton} variant="neutral" size="icon-sm" onClick={() => setEditing(true)}>
                  <Pencil aria-hidden="true" />
                </Button>
              )}
              {withTooltip(
                t('item.got', { title: wish.title }),
                <Button variant="neutral" size="icon-sm" disabled={receive.isPending} onClick={gotWish}>
                  <Check aria-hidden="true" />
                </Button>
              )}
              {withTooltip(
                t('item.archive', { title: wish.title }),
                <Button variant="neutral" size="icon-sm" disabled={archive.isPending} onClick={archiveWish}>
                  <Archive aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
        </WishCard>
      )}
    </li>
  );
};
