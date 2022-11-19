import styled from '@emotion/styled';
import Link from 'next/link';
import React from 'react';
import GivtoLogo from '../../../assets/givto-logo.svg';
import { Box } from './ui/box';
import { Button } from './ui/button';
import { Layout } from './ui/layout';

const StyledLogo = styled(GivtoLogo)`
  transform: rotate(-15deg);
  margin-bottom: 32px;
  width: 200px;
`;

const PageContent = styled(Box)`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  min-height: 100vh;
`.withComponent('main');

export const ErrorContent: React.FC<{ statusCode: number }> = ({
  statusCode,
}) => {
  switch (statusCode) {
    case 404:
      return (
        <>
          <Box as="h1" p={2}>
            Givto didn't find this page 😧
          </Box>
          <Box as="p" p={2}>
            Either this page doesn't exist, or you are not logged in.
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

export const ErrorPage: React.FC<{ statusCode: number }> = ({ statusCode }) => (
  <Layout>
    <PageContent>
      <StyledLogo />
      <ErrorContent statusCode={statusCode} />
      <Link passHref legacyBehavior href="/">
        <Button as="a" marginTop={2}>
          Go Home
        </Button>
      </Link>
    </PageContent>
  </Layout>
);
