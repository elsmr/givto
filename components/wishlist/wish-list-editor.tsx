import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/adapter/element-adapter';
import { useTranslations } from 'next-intl';
import { useEffect, useState, type ReactNode } from 'react';
import { SortableWishItem } from './sortable-wish-item';
import { isWishDragData } from './use-sortable-wish';
import type { WishView } from './wish-draft';

interface WishListEditorProps<T extends WishView> {
  wishes: T[];
  onMove: (wishId: string, toIndex: number) => void;
  status?: (wish: T) => ReactNode;
  actions?: (wish: T) => ReactNode;
}

/** An editable list of my wishes (all of them, or a group's): drag by the handle, or use the move up / down buttons (keyboard). */
export const WishListEditor = <T extends WishView>({ wishes, onMove, status, actions }: WishListEditorProps<T>) => {
  const t = useTranslations('wishlist.item');
  const [announcement, setAnnouncement] = useState('');

  const moveTo = (wish: T, toIndex: number) => {
    onMove(wish.id, toIndex);
    setAnnouncement(t('moved', { title: wish.title, position: toIndex + 1, count: wishes.length }));
  };

  useEffect(
    () =>
      monitorForElements({
        onDrop: ({ source, location }) => {
          const target = location.current.dropTargets[0]?.data;
          const wish = wishes.find((w) => w.id === source.data.wishId);
          if (wish && target && isWishDragData(target)) moveTo(wish, target.index);
        },
      }),
    // moveTo reads the current list; re-subscribing on every list change keeps it fresh.
    [wishes]
  );

  return (
    <>
      <ol className="flex flex-col gap-4">
        {wishes.map((wish, index) => (
          <SortableWishItem
            key={wish.id}
            wish={wish}
            index={index}
            count={wishes.length}
            onMove={(toIndex) => moveTo(wish, toIndex)}
            status={status?.(wish)}
            actions={actions?.(wish)}
          />
        ))}
      </ol>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </>
  );
};
