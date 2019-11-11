import React from 'react';
import styled from 'styled-components';
import { theme } from 'styled-tools';
import GivtoLogo from '../assets/givto-logo.svg';
import { Box } from '../components/Box';
import { Button } from '../components/Button';
import { Header } from '../components/header';
import { Layout, LayoutWrapper } from '../components/layout';

const StyledLogo = styled(GivtoLogo)`
  transform: rotate(-15deg);
  width: 72px;
  padding: ${theme('space.2')}px;
`;

const Main = styled.main`
  height: 50vh;
  width: 100%;
  background: ${theme('colors.primary')};
  border-color: black;
  border-width: ${theme('borderWidths.0')}px;
  border-top-style: solid;
  border-bottom-style: solid;
  border-color: black;
  border-width: ${theme('borderWidths.0')}px;
  border-top-style: solid;
  border-bottom-style: solid;
`;

const Footer = styled.footer`
  height: 20vh;
  width: 100%;
  background: ${theme('colors.white')};
  border-color: black;
  border-width: ${theme('borderWidths.0')}px;
  border-top-style: solid;
  border-bottom-style: solid;
  border-bottom-style: none;
`;

const Spacer = styled.div`
  height: ${theme('space.4')}px;
`;

export default () => {
  return (
    <Layout>
      <LayoutWrapper>
        <Header />
      </LayoutWrapper>
      <Spacer />

      <LayoutWrapper>
        <Box>
          <h2 style={{ color: '#fff' }}>
            Start exchanging gifts with friends and family
          </h2>
          <Button onClick={console.log}>Create</Button>
        </Box>
      </LayoutWrapper>

      <Spacer />

      <Main>
        <LayoutWrapper>
          <h2 style={{ color: '#fff' }}>
            Start exchanging gifts with friends and family
          </h2>
          <Button onClick={console.log}>Create</Button>
        </LayoutWrapper>
      </Main>
      <Spacer />
      <Footer>
        <LayoutWrapper>
          <StyledLogo />
          <Button as="a" href="https://github.com/eliasmeire/givto">
            View Source
          </Button>
        </LayoutWrapper>
      </Footer>
    </Layout>
  );
};
