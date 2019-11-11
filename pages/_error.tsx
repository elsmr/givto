import { NextPage } from 'next';
import Link from 'next/link';
import React from 'react';
import styled from 'styled-components';
import { theme } from 'styled-tools';
import GivtoLogo from '../assets/givto-logo.svg';
import { Button } from '../components/Button';
import { Layout } from '../components/layout';

const StyledLogo = styled(GivtoLogo)`
  transform: rotate(-15deg);
  width: 200px;
  padding: ${theme('space.2')}px;
`;

const PageContent = styled.main`
  padding: ${theme('space.2')}px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  min-height: 100vh;
`;

const Title = styled.h1`
  margin: 0;
  padding: ${theme('space.2')}px;
`;

const Description = styled.p`
  margin: 0;
  padding: ${theme('space.2')}px;
`;

const ErrorContent: React.FC<{ statusCode: number }> = ({ statusCode }) => {
  switch (statusCode) {
    case 404:
      return (
        <>
          <Title>Givto didn't find this page 😧</Title>
          <Description>
            You just hit a route that doesn&#39;t exist... the sadness.
          </Description>
        </>
      );
    default:
      return (
        <>
          <Title>Givto encountered an unknown error ⚠️</Title>
          <Description>Please try again later.</Description>
        </>
      );
  }
};

const Error: NextPage<{ statusCode: number }> = ({ statusCode }) => (
  <Layout>
    <PageContent>
      <StyledLogo />
      <ErrorContent statusCode={statusCode} />
      <Link href="/">
        <Button as="a">Go Home</Button>
      </Link>
    </PageContent>
  </Layout>
);

Error.getInitialProps = async ({ res, err }) => {
  const statusCode = res
    ? res.statusCode
    : err
    ? (err.statusCode as number)
    : 404;
  return { statusCode };
};

export default Error;
