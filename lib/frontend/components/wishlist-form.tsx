import { WishListItem } from '@givto/api/data-sources/mongo';
import { useMutation } from 'graphql-hooks';
import { useState } from 'react';
import { Plus, Save, X } from 'react-feather';
import { useForm } from 'react-hook-form';
import { Avatar } from './ui/avatar';
import { BorderBox } from './ui/border-box';
import { Box } from './ui/box';
import { IconButton } from './ui/icon-button';
import { Input } from './ui/input';
import { InputLabel } from './ui/labeled-input';
import { Wishlist } from './wishlist';

const ADD_WISHLISTITEM_MUTATION = `mutation addWishlistItem($slug: String!, $wishlistItem: WishlistItemInput!) {
    addWishlistItem(
        slug: $slug
        wishlistItem: $wishlistItem
    ) {
        id
        title
        description
    }
  }`;

const DELETE_WISHLISTITEM_MUTATION = `mutation deleteWishlistItem($slug: String!, $wishlistItemId: String!) {
    deleteWishlistItem(
        slug: $slug
        wishlistItemId: $wishlistItemId
    ) {
        id
        title
        description
    }
  }`;

const REORDER_WISHLISTITEM_MUTATION = `mutation reorderWishlistItem($slug: String!, $wishlistItemId: String!, $destinationIndex: Int!) {
    reorderWishlistItem(
        slug: $slug
        wishlistItemId: $wishlistItemId
        destinationIndex: $destinationIndex
    ) {
        id
        title
        description
    }
  }`;

const EDIT_WISHLISTITEM_MUTATION = `mutation editWishlistItem($slug: String!, $wishlistItemId: String!, $update: WishlistItemInput!) {
    editWishlistItem(
        slug: $slug
        wishlistItemId: $wishlistItemId
        update: $update
    ) {
        id
        title
        description
    }
  }`;

interface WishListFormProps {
  slug: string;
  wishlist: WishListItem[];
}

export const WishlistForm: React.FC<WishListFormProps> = ({
  slug,
  wishlist: wishlistProp,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [wishlist, setWishlist] = useState(wishlistProp);
  const [addWishlistItemMutation] = useMutation(ADD_WISHLISTITEM_MUTATION);
  const [deleteWishlistItemMutation] = useMutation(
    DELETE_WISHLISTITEM_MUTATION
  );
  const [reorderWishlistMutation] = useMutation(REORDER_WISHLISTITEM_MUTATION);
  const [editWishlistMutation] = useMutation(EDIT_WISHLISTITEM_MUTATION);

  const onSubmit = async (newItem: WishListItem) => {
    const { data } = await addWishlistItemMutation({
      variables: { slug, wishlistItem: newItem },
    });
    setWishlist(data.addWishlistItem);
    setIsAdding(false);
  };

  const deleteItem = (id: string) => {
    const newWishlist = wishlist.filter((item) => item.id !== id);
    setWishlist(newWishlist);
    deleteWishlistItemMutation({
      variables: { slug, wishlistItemId: id },
    });
  };

  const editItem = (id: string, update: Partial<WishListItem>) => {
    const newWishlist = wishlist.map((item) =>
      item.id === id ? { ...item, ...update } : item
    );
    setWishlist(newWishlist);
    editWishlistMutation({
      variables: { slug, wishlistItemId: id, update },
    });
  };

  const reorderItem = ({
    id,
    destinationIndex,
  }: {
    id: string;
    destinationIndex: number;
  }): void => {
    const newWishlist = [...wishlist];
    const srcIndex = newWishlist.findIndex((item) => item.id === id);
    const [srcItem] = newWishlist.splice(srcIndex, 1);
    newWishlist.splice(destinationIndex, 0, srcItem);

    setWishlist(newWishlist);
    reorderWishlistMutation({
      variables: { slug, wishlistItemId: id, destinationIndex },
    });
  };

  return (
    <Box>
      <Wishlist
        wishlist={wishlist}
        isEditable={true}
        onDelete={deleteItem}
        onReorder={reorderItem}
        onEditSubmit={editItem}
      />

      {wishlist.length === 0 && !isAdding && (
        <Box
          display="flex"
          flexDirection="column"
          minHeight="200px"
          alignItems="center"
          justifyContent="center"
        >
          <Box fontSize={3} as="p" marginBottom={3}>
            Your wishlist is empty 😧
          </Box>
          {!isAdding && (
            <IconButton onClick={() => setIsAdding(true)}>
              <Plus />
              <Box px={2}>Add</Box>
            </IconButton>
          )}
        </Box>
      )}

      {!isAdding && wishlist.length !== 0 && (
        <Box display="flex" justifyContent="center">
          <IconButton onClick={() => setIsAdding(true)}>
            <Plus />
            <Box px={2}>Add</Box>
          </IconButton>
        </Box>
      )}

      {isAdding && (
        <WishlistItemForm
          index={wishlist.length + 1}
          onCancel={() => setIsAdding(false)}
          onSubmit={onSubmit}
        />
      )}
    </Box>
  );
};

export const WishlistItemForm: React.FC<{
  onSubmit: (item: WishListItem) => void;
  onCancel: () => void;
  index: number;
  init?: WishListItem;
}> = ({ onSubmit, onCancel, index, init }) => {
  const { handleSubmit, register } = useForm<WishListItem>({
    defaultValues: init,
  });

  return (
    <Box
      display="flex"
      marginBottom={3}
      borderStyle="solid"
      borderColor=""
      borderWidth={1}
      p={2}
    >
      <Avatar name={`${index}`} marginRight={3} />
      <Box as="form" flexGrow={1} onSubmit={handleSubmit(onSubmit)}>
        <InputLabel label="Title" marginBottom={3}>
          <Input
            {...register('title', { required: true })}
            placeholder="What gift do you want?"
          />
        </InputLabel>
        <InputLabel label="Description" marginBottom={3} isOptional>
          <Input
            {...register('description')}
            placeholder="Describe your gift! include hints, links etc."
            as="textarea"
            noresize
            rows={4}
          />
        </InputLabel>
        <Box display="flex" justifyContent="flex-end">
          <IconButton marginRight={2} type="submit">
            <Save size={16} /> <Box px={2}>Save</Box>
          </IconButton>
          <IconButton
            color="black"
            bg="secondary"
            type="button"
            onClick={onCancel}
          >
            <X size={16} /> <Box px={2}>Cancel</Box>
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
};
