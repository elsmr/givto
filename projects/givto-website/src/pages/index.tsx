import { Box, Button } from '@givto/components';
import { getThemeColor, getThemeScale, getThemeValue } from '@givto/utils';
import { graphql, useStaticQuery } from 'gatsby';
import React from 'react';
import styled from 'styled-components';
import { Header } from '../components/header';
import { Layout, LayoutWrapper } from '../components/layout';
import SEO from '../components/seo';
import GivtoLogo from '../images/givto-logo.svg';

const StyledLogo = styled(GivtoLogo)`
  transform: rotate(-15deg);
  width: 72px;
  padding: ${getThemeScale('space', 2)}px;
`;

const horizontalBorder = `
  border-color: black;
  border-width: ${getThemeScale('borderWidths')};
  border-top-style: solid;
  border-bottom-style: solid;
  `;

const Hero = styled(Box)`
  width: 100%;
  height: 30vh;
  min-height: 320px;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const HeroText = styled.p`
  font-size: ${getThemeScale('fontSizes', 5)}px;
  font-weight: ${getThemeScale('fontWeights', 2)};
  text-align: center;
  margin: 0;
  font-family: ${getThemeValue('fontFamilies', 'title')};
`;

const Main = styled.main`
  height: 50vh;
  width: 100%;
  background: ${getThemeColor('primary')};
  border-color: black;
  border-width: ${getThemeScale('borderWidths')};
  border-top-style: solid;
  border-bottom-style: solid;
  ${horizontalBorder}
`;

const Footer = styled.footer`
  height: 20vh;
  width: 100%;
  background: ${getThemeColor('white')};
  ${horizontalBorder}
  border-bottom-style: none;
`;

const Spacer = styled.div`
  height: ${getThemeScale('space', 4)}px;
`;

export default () => {
  const data = useStaticQuery(graphql`
    query SiteTitleQuery {
      site {
        siteMetadata {
          title
        }
      }
    }
  `);

  return (
    <Layout>
      <SEO title="Home" />
      <LayoutWrapper>
        <Header siteTitle={data.site.siteMetadata.title} />
        <Hero>
          <HeroText>Organize Secret Santa with ease on givto</HeroText>
        </Hero>
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
