import styled from '@emotion/styled';
import { CreateGroupForm } from '@givto/frontend/components/create-group-form';
import { Header } from '@givto/frontend/components/header';
import { ProfileButton } from '@givto/frontend/components/profile-button';
import { BorderBox } from '@givto/frontend/components/ui/border-box';
import { Box } from '@givto/frontend/components/ui/box';
import { Button } from '@givto/frontend/components/ui/button';
import { Layout, LayoutWrapper } from '@givto/frontend/components/ui/layout';
import { Link } from '@givto/frontend/components/ui/link';
import React, { useRef } from 'react';
import { GitHub } from 'react-feather';
import AssignIllustration from '../assets/assign.svg';
import GivtoLogo from '../assets/givto-logo.svg';
import InviteIllustration from '../assets/invite.svg';

const StyledLogo = styled(GivtoLogo)`
  transform: rotate(-15deg);
  width: 72px;
`;

const Footer = styled(Box)`
  width: 100%;
  border-color: black;
  border-top-style: solid;
  border-bottom-style: none;
`.withComponent('footer');

const HomePage = () => {
  return (
    <Layout display="flex" flexDirection="column" justifyItems="stretch">
      <Box marginBottom={5}>
        <Header bg="white" actions={<ProfileButton />} />
      </Box>

      <Box as="main" flexGrow={1}>
        <LayoutWrapper marginBottom={5}>
          <BorderBox p={4}>
            <Box as="h2" marginBottom={4} fontSize={5}>
              Organize your Secret Santa
            </Box>
            <CreateGroupForm />
          </BorderBox>
        </LayoutWrapper>

        <Box marginBottom={6} py={5}>
          <LayoutWrapper>
            <Box
              display="flex"
              flexWrap="wrap"
              alignItems="center"
              marginBottom={5}
            >
              <Box
                p={[4, 1]}
                paddingRight={[4, 5]}
                flexBasis={['100%', '50%']}
                order={[2, 1]}
              >
                <InviteIllustration style={{ width: '100%' }} />
              </Box>

              <Box flexBasis={['100%', '50%']} order={[1, 2]}>
                <Box as="h3" fontSize={5} marginBottom={3}>
                  Invite your friends
                </Box>

                <Box as="p" lineHeight="body" fontSize={3}>
                  Invite all your friends and family by email. They will be able
                  to enter their wishlists in private.
                </Box>
              </Box>
            </Box>
            <Box display="flex" flexWrap="wrap" alignItems="center">
              <Box paddingRight={[4, 5]} flexBasis={['100%', '50%']}>
                <Box as="h3" fontSize={5} marginBottom={3}>
                  Randomly assign gifts
                </Box>

                <Box as="p" lineHeight="body" fontSize={3}>
                  With just one click Givto assigns a Secret Santa to everyone.
                  The identity of the Secret Santas remains secret.
                </Box>
              </Box>

              <Box p={[4, 1]} flexBasis={['100%', '50%']}>
                <AssignIllustration style={{ width: '100% ' }} />
              </Box>
            </Box>
          </LayoutWrapper>
        </Box>
      </Box>

      <Footer bg="primary">
        <LayoutWrapper
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          py={5}
        >
          <Box marginBottom={3}>
            <StyledLogo />
          </Box>
          <Box color="white" marginBottom={3}>
            by{' '}
            <Link color="white" href="https://elsmr.dev">
              elsmr
            </Link>
          </Box>
          <Link color="white" href="https://github.com/elsmr/givto">
            <Box display="flex" alignItems="center">
              <Box marginRight={1}>
                <GitHub size={16} />
              </Box>{' '}
              View Source
            </Box>
          </Link>
        </LayoutWrapper>
      </Footer>
    </Layout>
  );
};

export default HomePage;
