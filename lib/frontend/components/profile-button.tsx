import { User } from '@givto/api/graphql-schema';
import NextLink from 'next/link';
import { ArrowRight } from 'react-feather';
import { Avatar } from './ui/avatar';
import { Box } from './ui/box';
import { IconButton } from './ui/icon-button';
import { Link } from './ui/link';

interface ProfileButtonProps {
  user: User | null;
  isLoading: boolean;
  onLogin: () => void;
}

export const ProfileButton: React.FC<ProfileButtonProps> = ({
  isLoading,
  user,
  onLogin
}) => {
  if (isLoading) {
    return null;
  }

  if (!user) {
    return (
      <IconButton
        flexShrink={0}
        display="flex"
        alignItems="center"
        onClick={onLogin}
      >
        <ArrowRight size={16} />
        <Box fontSize={2} px={2}>
          Login
        </Box>
      </IconButton>
    );
  }

  return (
    <NextLink href="/profile">
      <Link
        display="flex"
        alignItems="center"
        borderStyle="solid"
        borderColor="black"
        borderWidth={1}
        flexShrink={0}
        p={2}
        css={{ textDecoration: 'none' }}
      >
        <Avatar name={user.name}></Avatar>
        <Box px={2} color="black">
          {user.name}
        </Box>
      </Link>
    </NextLink>
  );
};
