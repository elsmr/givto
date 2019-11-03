import { Button } from '@givto/components';
import { getThemeScale } from '@givto/utils';
import { Link } from 'gatsby';
import React from 'react';
import styled from 'styled-components';
import { Layout } from '../components/layout';
import SEO from '../components/seo';
import GivtoLogo from '../images/givto-logo.svg';

const StyledLogo = styled(GivtoLogo)`
  transform: rotate(-15deg);
  width: 200px;
  padding: ${getThemeScale('space', 2)}px;
`;

const PageContent = styled.main`
  padding: ${getThemeScale('space', 2)}px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  min-height: 100vh;
`;

const Title = styled.h1`
  margin: 0;
  padding: ${getThemeScale('space', 2)}px;
`;

const Description = styled.p`
  margin: 0;
  padding: ${getThemeScale('space', 2)}px;
`;

const StyledLink = styled(Link)`
  padding: ${getThemeScale('space', 2)}px;
`;

export default () => (
  <Layout>
    <SEO title="404: Not found" />
    <PageContent>
      <StyledLogo />
      <Title>Givto didn't find this page 😧</Title>
      <Description>
        You just hit a route that doesn&#39;t exist... the sadness.
      </Description>
      <StyledLink to="/">
        <Button as="div">Go Home</Button>
      </StyledLink>
    </PageContent>
  </Layout>
);
