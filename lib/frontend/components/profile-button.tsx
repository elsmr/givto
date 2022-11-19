import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { useContext } from 'react';
import { ArrowRight } from 'react-feather';
import { AuthContext } from '../auth/auth.util';
import { Avatar } from './ui/avatar';
import { Box } from './ui/box';
import { IconButton } from './ui/icon-button';
import { Link } from './ui/link';

export const ProfileButton: React.FC = () => {
  const { asPath } = useRouter();
  const { user, isLoading, isInitialized } = useContext(AuthContext);

  if (isLoading || !isInitialized) {
    return null;
  }

  if (!user) {
    return (
      <NextLink href={`/login?redirect=${asPath}`} passHref legacyBehavior>
        <IconButton as="a" flexShrink={0} display="flex" alignItems="center">
          <ArrowRight size={16} />
          <Box fontSize={2} px={2}>
            Sign In
          </Box>
        </IconButton>
      </NextLink>
    );
  }

  return (
    <NextLink passHref legacyBehavior href="/profile">
      <Link
        display="flex"
        alignItems="center"
        borderStyle="solid"
        borderColor="black"
        borderWidth={1}
        flexShrink={0}
        p={1}
        bg="white"
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
