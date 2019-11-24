import styled from '@emotion/styled';
import React from 'react';
import GivtoLogo from '../assets/givto-logo.svg';
import { CreateGroupForm } from '../lib/components/create-group-form';
import { Header } from '../lib/components/header';
import { BorderBox } from '../lib/components/ui/border-box';
import { Box } from '../lib/components/ui/box';
import { Button } from '../lib/components/ui/button';
import { Layout, LayoutWrapper } from '../lib/components/ui/layout';
import { Link } from '../lib/components/ui/link';

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

export default () => {
  return (
    <Layout display="flex" flexDirection="column" justifyItems="stretch">
      <LayoutWrapper marginBottom={4}>
        <Header />
      </LayoutWrapper>

      <LayoutWrapper flexGrow={1}>
        <BorderBox as="main" p={4}>
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
    </Layout>
  );
};
