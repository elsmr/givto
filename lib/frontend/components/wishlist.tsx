import { WishListItem } from '@givto/api/data-sources/mongo';
import { Trash2 as Trash } from 'react-feather';
import { Avatar } from './ui/avatar';
import { Box } from './ui/box';
import { IconButton } from './ui/icon-button';

interface WishlistProps {
  wishlist: WishListItem[];
  isEditable?: boolean;
  onDelete?: (index: number) => void;
}

export const Wishlist: React.FC<WishlistProps> = ({
  wishlist,
  isEditable,
  onDelete
}) => {
  return (
    <>
      {wishlist.map((item, index) => (
        <Box
          key={item.title}
          display="flex"
          flexDirection="column"
          marginBottom={3}
          borderStyle="solid"
          borderColor="black"
          borderWidth={1}
          p={2}
        >
          <Box display="flex" alignItems="center">
            <Avatar name={`${index + 1}`} marginRight={3} />
            <Box as="h4" fontSize={3} fontWeight={'body' as any} flexGrow={1}>
              {item.title}
            </Box>
            {isEditable && onDelete && (
              <IconButton
                bg="danger"
                color="black"
                size="small"
                onClick={() => onDelete(index)}
              >
                <Trash size={12} />
                <Box marginLeft={1}>Delete</Box>
              </IconButton>
            )}
          </Box>
          {item.description && (
            <Box marginLeft="48px" marginTop={2}>
              <div
                dangerouslySetInnerHTML={{
                  __html: item.description.replace(
                    /(https?:\/\/[^\s]+)/g,
                    url => `<a href="${url}">${url}</a>`
                  )
                }}
              />
            </Box>
          )}
        </Box>
      ))}
    </>
  );
};
Wishlist.defaultProps = {
  isEditable: false
};
