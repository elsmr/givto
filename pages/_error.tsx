import styled from '@emotion/styled';
import { NextPage } from 'next';
import Link from 'next/link';
import React from 'react';
import GivtoLogo from '../assets/givto-logo.svg';
import { Box } from '../lib/components/ui/box';
import { Button } from '../lib/components/ui/button';
import { Layout } from '../lib/components/ui/layout';

const StyledLogo = styled(GivtoLogo)`
  transform: rotate(-15deg);
  width: 200px;
`;

const PageContent = styled(Box)`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  min-height: 100vh;
`.withComponent('main');

const ErrorContent: React.FC<{ statusCode: number }> = ({ statusCode }) => {
  switch (statusCode) {
    case 404:
      return (
        <>
          <Box as="h1" p={2}>
            Givto didn't find this page 😧
          </Box>
          <Box as="p" p={2}>
            You just hit a route that doesn&#39;t exist... the sadness.
          </Box>
        </>
      );
    default:
      return (
        <>
          <Box as="h1" p={2}>
            Givto encountered an unknown error ⚠️
          </Box>
          <Box as="p" p={2}>
            Please try again later.
          </Box>
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
