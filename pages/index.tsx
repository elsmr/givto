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
  const createGroupRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Layout display="flex" flexDirection="column" justifyItems="stretch">
      <LayoutWrapper marginBottom={5}>
        <Header actions={<ProfileButton />} />
      </LayoutWrapper>

      <Box as="main" flexGrow={1}>
        <LayoutWrapper marginBottom={5}>
          <Box
            height="40vh"
            minHeight="400px"
            display="flex"
            alignItems="center"
          >
            <Box>
              <Box
                as="p"
                fontSize={[5, 6]}
                fontFamily="heading"
                fontWeight="bold"
                lineHeight="body"
                marginBottom={4}
                maxWidth="80%"
              >
                Organize Secret Santa with your friends and family with ease.
              </Box>
              <Button
                onClick={() => {
                  setTimeout(() => inputRef.current?.focus(), 200);
                  createGroupRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                    inline: 'center'
                  });
                }}
              >
                Get Started
              </Button>
            </Box>
          </Box>
        </LayoutWrapper>

        <Box
          bg="primary"
          marginBottom={6}
          py={5}
          borderTopStyle="solid"
          borderBottomStyle="solid"
          borderColor="black"
          borderWidth={1}
          color="white"
        >
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
                  Randomly assign gift givers
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

        <LayoutWrapper marginBottom={6}>
          <BorderBox p={4}>
            <Box as="h2" marginBottom={3} fontSize={5}>
              Create your Group
            </Box>
            <CreateGroupForm ref={createGroupRef} inputRef={inputRef} />
          </BorderBox>
        </LayoutWrapper>
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
            <Link color="white" href="https://twitter.com/eliasmeir">
              @eliasmeir
            </Link>
          </Box>
          <Button
            as="a"
            href="https://github.com/eliasmeire/givto"
            variant="secondary"
          >
            View Source
          </Button>
        </LayoutWrapper>
      </Footer>
    </Layout>
  );
};

export default HomePage;
