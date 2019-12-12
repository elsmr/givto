import { WishListItem } from '@givto/api/data-sources/mongo';
import { useMutation } from 'graphql-hooks';
import { useState } from 'react';
import { Plus, Save, X } from 'react-feather';
import useForm from 'react-hook-form';
import { Avatar } from './ui/avatar';
import { BorderBox } from './ui/border-box';
import { Box } from './ui/box';
import { IconButton } from './ui/icon-button';
import { Input } from './ui/input';
import { InputLabel } from './ui/labeled-input';
import { Wishlist } from './wishlist';

const SET_WISHLIST_MUTATION = `mutation setWishlist($slug: String!, $wishlist: [WishlistItemInput]!) {
    setWishlist(
        slug: $slug
      wishlist: $wishlist
    ) {
      wishlist {
          title
          description
      }
    }
  }`;

interface WishListFormProps {
  slug: string;
  wishlist: WishListItem[];
}

export const WishlistForm: React.FC<WishListFormProps> = ({
  slug,
  wishlist: wishlistProp
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [wishlist, setWishlist] = useState(wishlistProp);
  const { handleSubmit, register } = useForm<WishListItem>();
  const [setWishlistMutation] = useMutation(SET_WISHLIST_MUTATION);

  const onSubmit = (newItem: WishListItem) => {
    console.log(newItem);
    const newWishlist = [...wishlist, newItem];
    setWishlist(newWishlist);
    setWishlistMutation({ variables: { slug, wishlist: newWishlist } });
    setIsAdding(false);
  };

  const deleteItem = (index: number) => {
    const newWishlist = [
      ...wishlist.slice(0, index),
      ...wishlist.slice(index + 1)
    ];
    setWishlist(newWishlist);
    setWishlistMutation({ variables: { slug, wishlist: newWishlist } });
  };

  return (
    <BorderBox p={3}>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        borderBottomStyle="solid"
        borderColor="black"
        borderWidth={1}
        paddingBottom={2}
        marginBottom={3}
      >
        <Box as="h3" fontSize={4} marginRight={2}>
          Your Wishlist
        </Box>
      </Box>
      <Box>
        <Box maxHeight="400px" overflowY="auto">
          <Wishlist
            wishlist={wishlist}
            isEditable={true}
            onDelete={deleteItem}
          />
        </Box>

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
          <Box
            display="flex"
            marginBottom={3}
            borderStyle="solid"
            borderColor="black"
            borderWidth={1}
            p={2}
          >
            <Avatar name={`${wishlist.length + 1}`} marginRight={3} />
            <Box as="form" flexGrow={1} onSubmit={handleSubmit(onSubmit)}>
              <InputLabel label="Title" marginBottom={3}>
                <Input
                  name="title"
                  placeholder="What gift do you want?"
                  ref={register({ required: true })}
                />
              </InputLabel>
              <InputLabel label="Description" marginBottom={3} isOptional>
                <Input
                  name="description"
                  placeholder="Describe your gift! include hints, links etc."
                  as="textarea"
                  noresize
                  ref={register}
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
                  onClick={() => setIsAdding(false)}
                >
                  <X size={16} /> <Box px={2}>Cancel</Box>
                </IconButton>
              </Box>
            </Box>
          </Box>
        )}
      </Box>
    </BorderBox>
  );
};
