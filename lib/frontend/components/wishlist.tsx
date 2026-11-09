import { WishListItem } from '@givto/api/data-sources/mongo';
import { useEffect, useRef, useState } from 'react';
import { Pen, Trash2 as Trash } from 'lucide-react';
import { Avatar } from './ui/avatar';
import { Box } from './ui/box';
import { IconButton } from './ui/icon-button';
import { WishlistItemForm } from './wishlist-form';
import {
  draggable,
  dropTargetForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';

interface WishlistProps {
  wishlist: WishListItem[];
  isEditable?: boolean;
  onDelete?: (id: string) => void;
  onEditSubmit?: (id: string, update: Partial<WishListItem>) => void;
  onReorder?: (move: { id: string; destinationIndex: number }) => void;
}

interface DraggableItemProps {
  item: WishListItem;
  index: number;
  isEditable: boolean;
  isEditing: boolean;
  onDelete?: (id: string) => void;
  onEdit: () => void;
  onEditSubmit?: (id: string, update: Partial<WishListItem>) => void;
  onEditCancel: () => void;
}

const DraggableItem: React.FC<DraggableItemProps> = ({
  item,
  index,
  isEditable,
  isEditing,
  onDelete,
  onEdit,
  onEditSubmit,
  onEditCancel,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || !isEditable) return;

    return combine(
      draggable({
        element,
        getInitialData: () => ({ id: item.id, index }),
        onDragStart: () => setIsDragging(true),
        onDrop: () => setIsDragging(false),
      }),
      dropTargetForElements({
        element,
        getData: () => ({ index }),
        canDrop: ({ source }) => {
          return source.data.id !== item.id;
        },
      })
    );
  }, [item.id, index, isEditable]);

  if (isEditing && onEditSubmit) {
    return (
      <WishlistItemForm
        key={item.id}
        index={index + 1}
        init={item}
        onCancel={onEditCancel}
        onSubmit={(update) => {
          onEditCancel();
          onEditSubmit(item.id, update);
        }}
      />
    );
  }

  return (
    <Box
      ref={ref}
      display="flex"
      flexDirection="column"
      marginBottom={3}
      bg="muted"
      borderRadius={8}
      borderWidth={1}
      p={3}
      pb={item.description ? 4 : 3}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: isEditable ? 'grab' : 'default',
      }}
    >
      <Box display="flex" alignItems="center">
        <Avatar name={`${index + 1}`} marginRight={3} flexShrink={0} />
        <Box
          as="h4"
          fontSize={3}
          fontWeight={'body' as any}
          flexGrow={1}
        >
          {item.title}
        </Box>
        {isEditable && onDelete && (
          <Box display="flex" minWidth="auto">
            <IconButton
              bg="primary"
              color="white"
              size="small"
              marginRight={1}
              onClick={onEdit}
            >
              <Pen size={16} />
            </IconButton>
            <IconButton
              bg="danger"
              color="black"
              size="small"
              onClick={() => onDelete(item.id)}
            >
              <Trash size={16} />
            </IconButton>
          </Box>
        )}
      </Box>
      {item.description && (
        <Box marginTop={2} lineHeight="body" style={{ whiteSpace: 'pre-line' }}>
          {item.description
            .split(/(https?:\/\/[^\s]+)/g)
            .map((part, index) =>
              index % 2 === 1 ? (
                <a key={index} href={part}>
                  {part}
                </a>
              ) : (
                part
              )
            )}
        </Box>
      )}
    </Box>
  );
};

export const Wishlist: React.FC<WishlistProps> = ({
  wishlist,
  isEditable = false,
  onDelete,
  onReorder,
  onEditSubmit,
}) => {
  const [editingId, setEditingId] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || !isEditable) return;

    return dropTargetForElements({
      element,
      onDrop: ({ source, location }) => {
        if (!onReorder) return;

        const sourceIndex = source.data.index;
        const sourceId = source.data.id;

        if (typeof sourceIndex !== 'number' || typeof sourceId !== 'string') {
          return;
        }

        // Get the target index from the closest drop target
        const target = location.current.dropTargets[0];
        if (!target) return;

        const destinationIndex = target.data.index;
        if (
          typeof destinationIndex !== 'number' ||
          destinationIndex === sourceIndex
        ) {
          return;
        }

        onReorder({ id: sourceId, destinationIndex });
      },
    });
  }, [isEditable, onReorder]);

  return (
    <Box ref={containerRef}>
      {wishlist.map((item, index) => (
        <DraggableItem
          key={item.id}
          item={item}
          index={index}
          isEditable={!!isEditable}
          isEditing={item.id === editingId}
          onDelete={onDelete}
          onEdit={() => setEditingId(item.id)}
          onEditSubmit={onEditSubmit}
          onEditCancel={() => setEditingId('')}
        />
      ))}
    </Box>
  );
};
