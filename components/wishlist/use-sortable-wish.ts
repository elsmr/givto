import { combine } from '@atlaskit/pragmatic-drag-and-drop/utils/combine';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/adapter/element-adapter';
import { useEffect, useRef, useState } from 'react';

/** Data on a dragged wish and on each drop target (the row it lands on). */
export interface WishDragData {
  [key: string | symbol]: unknown;
  wishId: string;
  index: number;
}

export const isWishDragData = (data: Record<string | symbol, unknown>): data is WishDragData =>
  typeof data.wishId === 'string' && typeof data.index === 'number';

/** Makes a row draggable by its handle and a drop target for other rows (pragmatic-drag-and-drop). */
export const useSortableWish = (wishId: string, index: number, enabled: boolean) => {
  const rowRef = useRef<HTMLLIElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [over, setOver] = useState(false);

  useEffect(() => {
    const element = rowRef.current;
    const dragHandle = handleRef.current;
    if (!enabled || !element || !dragHandle) return;
    const data: WishDragData = { wishId, index };
    return combine(
      draggable({
        element,
        dragHandle,
        getInitialData: () => data,
        onDragStart: () => setDragging(true),
        onDrop: () => setDragging(false),
      }),
      dropTargetForElements({
        element,
        getData: () => data,
        canDrop: ({ source }) => source.data.wishId !== wishId,
        onDragEnter: () => setOver(true),
        onDragLeave: () => setOver(false),
        onDrop: () => setOver(false),
      })
    );
  }, [wishId, index, enabled]);

  return { rowRef, handleRef, dragging, over };
};
