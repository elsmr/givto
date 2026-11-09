import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { SortableWishItem } from './sortable-wish-item';
import { isWishDragData } from './use-sortable-wish';
import { useWishMutations } from './use-wish-mutations';
import type { WishView } from './wish-draft';

/** The owner's list: drag by the handle, or use the move up / down buttons (keyboard). */
export const WishListEditor = ({ wishes }: { wishes: WishView[] }) => {
  const t = useTranslations('wishlist.item');
  const { move } = useWishMutations();
  const [announcement, setAnnouncement] = useState('');

  const moveTo = (wish: WishView, toIndex: number) => {
    move.mutate({ wishId: wish.id, toIndex });
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
          />
        ))}
      </ol>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </>
  );
};
