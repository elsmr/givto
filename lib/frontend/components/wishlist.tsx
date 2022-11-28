import { WishListItem } from '@givto/api/data-sources/mongo';
import { useState } from 'react';
import {
  DragDropContext,
  Draggable,
  Droppable,
  DropResult,
} from 'react-beautiful-dnd';
import { Edit2, Trash2 as Trash } from 'react-feather';
import { Avatar } from './ui/avatar';
import { Box } from './ui/box';
import { IconButton } from './ui/icon-button';
import { WishlistItemForm } from './wishlist-form';

interface WishlistProps {
  wishlist: WishListItem[];
  isEditable?: boolean;
  onDelete?: (id: string) => void;
  onEditSubmit?: (id: string, update: Partial<WishListItem>) => void;
  onReorder?: (move: { id: string; destinationIndex: number }) => void;
}

export const Wishlist: React.FC<WishlistProps> = ({
  wishlist,
  isEditable,
  onDelete,
  onReorder,
  onEditSubmit,
}) => {
  const [editingId, setEditingId] = useState('');
  const onDragEnd = ({
    destination,
    source,
    draggableId,
  }: DropResult): void => {
    if (!onReorder || !destination || destination.index === source.index) {
      return;
    }

    onReorder({ id: draggableId, destinationIndex: destination.index });
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable isDropDisabled={!isEditable} droppableId="wishlist">
        {({ placeholder, droppableProps, innerRef }) => (
          <Box {...droppableProps} ref={innerRef}>
            {wishlist.map((item, index) =>
              item.id === editingId && onEditSubmit ? (
                <WishlistItemForm
                  key={item.id}
                  index={index + 1}
                  init={item}
                  onCancel={() => setEditingId('')}
                  onSubmit={(update) => {
                    setEditingId('');
                    onEditSubmit(item.id, update);
                  }}
                />
              ) : (
                <Draggable
                  isDragDisabled={!isEditable}
                  key={item.id}
                  draggableId={item.id}
                  index={index}
                >
                  {({ draggableProps, dragHandleProps, innerRef }) => (
                    <Box
                      display="flex"
                      flexDirection="column"
                      marginBottom={3}
                      bg="muted"
                      borderRadius={8}
                      borderWidth={1}
                      p={3}
                      pb={item.description ? 4 : 3}
                      {...draggableProps}
                      {...dragHandleProps}
                      ref={innerRef}
                    >
                      <Box display="flex" alignItems="center">
                        <Avatar
                          name={`${index + 1}`}
                          marginRight={3}
                          flexShrink={0}
                        />
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
                            {!editingId && (
                              <IconButton
                                bg="primary"
                                color="white"
                                size="small"
                                marginRight={1}
                                onClick={() => setEditingId(item.id)}
                              >
                                <Edit2 size={16} />
                              </IconButton>
                            )}
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
                        <Box marginTop={2} lineHeight="body">
                          <div
                            dangerouslySetInnerHTML={{
                              __html: item.description
                                .replace(/\n/g, ' <br /> ')
                                .replace(
                                  /(https?:\/\/[^\s]+)/g,
                                  (url) => `<a href="${url}">${url}</a>`
                                ),
                            }}
                          />
                        </Box>
                      )}
                    </Box>
                  )}
                </Draggable>
              )
            )}
            {placeholder}
          </Box>
        )}
      </Droppable>
    </DragDropContext>
  );
};
Wishlist.defaultProps = {
  isEditable: false,
};
