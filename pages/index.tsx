import styled from '@emotion/styled';
import { AuthContext } from '@givto/frontend/auth/auth.util';
import { CreateGroupForm } from '@givto/frontend/components/create-group-form';
import { Header } from '@givto/frontend/components/header';
import { LoginModal } from '@givto/frontend/components/login-modal';
import { ProfileButton } from '@givto/frontend/components/profile-button';
import { BorderBox } from '@givto/frontend/components/ui/border-box';
import { Box } from '@givto/frontend/components/ui/box';
import { Button } from '@givto/frontend/components/ui/button';
import { Layout, LayoutWrapper } from '@givto/frontend/components/ui/layout';
import { Link } from '@givto/frontend/components/ui/link';
import React, { useContext, useRef, useState } from 'react';
import GivtoLogo from '../assets/givto-logo.svg';

const StyledLogo = styled(GivtoLogo)`
  transform: rotate(-15deg);
  width: 72px;
`;

const Columns = styled(Box)`
  @media (min-width: 500px) {
    display: grid;
    grid-template-columns: 1fr;
    grid-gap: 1rem;
    grid-template-columns: repeat(3, 1fr);
  }
`;

const Footer = styled(Box)`
  width: 100%;
  border-color: black;
  border-top-style: solid;
  border-bottom-style: none;
`.withComponent('footer');

export default () => {
  const { user, isLoading } = useContext(AuthContext);
  const [isLoginVisible, setIsLoginVisible] = useState(false);
  const createGroupRef = useRef<HTMLElement>(null);

  return (
    <Layout display="flex" flexDirection="column" justifyItems="stretch">
      <LayoutWrapper marginBottom={4}>
        <Header
          actions={
            <ProfileButton
              user={user}
              isLoading={isLoading}
              onLogin={() => setIsLoginVisible(true)}
            />
          }
        />
      </LayoutWrapper>

      <LayoutWrapper as="main" flexGrow={1}>
        <Box
          height="40vh"
          minHeight="400px"
          marginBottom={5}
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

        {/* <Columns height="40vh" marginBottom={5}>
          <Box border="1px solid black">Column 1</Box>
          <Box border="1px solid black">Column 2</Box>
          <Box border="1px solid black">Column 3</Box>
        </Columns> */}

        <BorderBox p={4} marginBottom={5}>
          <Box ref={createGroupRef} as="h2" marginBottom={3} fontSize={5}>
            Create your Group
          </Box>
          <CreateGroupForm />
        </BorderBox>
      </LayoutWrapper>

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

      {isLoginVisible && (
        <LoginModal
          onClose={() => setIsLoginVisible(false)}
          onLogin={() => {
            setIsLoginVisible(false);
          }}
        />
      )}
    </Layout>
  );
};
