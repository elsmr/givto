import styled from '@emotion/styled';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import React from 'react';
import GivtoLogo from '../../../assets/givto-logo.svg';
import { Footer } from './footer';
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
  const t = useTranslations('error-page');
  switch (statusCode) {
    case 404:
      return (
        <>
          <Box as="h1" p={2}>
            {t('not-found.title')}
          </Box>
          <Box as="p" p={2}>
            {t('not-found.description')}
          </Box>
        </>
      );
    default:
      return (
        <>
          <Box as="h1" p={2}>
            {t('fallback.title')}
          </Box>
          <Box as="p" p={2}>
            {t('fallback.description')}
          </Box>
        </>
      );
  }
};

export const ErrorPage: React.FC<{ statusCode: number }> = ({ statusCode }) => {
  const t = useTranslations('error-page');
  return (
    <Layout>
      <PageContent>
        <StyledLogo />
        <ErrorContent statusCode={statusCode} />
        <Link passHref legacyBehavior href="/">
          <Button as="a" marginTop={2}>
            {t('go-home')}
          </Button>
        </Link>
      </PageContent>
      <Footer />
    </Layout>
  );
};
