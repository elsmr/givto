import { BorderBox } from '@givto/frontend/components/ui/border-box';
import { Box } from '@givto/frontend/components/ui/box';
import { Button } from '@givto/frontend/components/ui/button';
import { Layout } from '@givto/frontend/components/ui/layout';
import { NextPage } from 'next';
import NextLink from 'next/link';
import React from 'react';
import GivtoLogo from '../assets/givto-logo.svg';

export const ConfirmEmailConfirmPage: NextPage = () => {
  return (
    <Layout
      display="flex"
      justifyContent="center"
      alignItems="center"
      p={[2, 3]}
    >
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        paddingBottom={6}
      >
        <NextLink href="/" passHref legacyBehavior>
          <Box as="a" css={{ textDecoration: 'none' }}>
            <Box
              width="72px"
              height="72px"
              marginBottom={3}
              css={{ transform: 'rotate(-15deg)' }}
            >
              <GivtoLogo />
            </Box>
            <Box as="h1" marginBottom={4} color="black">
              Givto
            </Box>
          </Box>
        </NextLink>
        <BorderBox
          width="100vw"
          minWidth="320px"
          maxWidth="560px"
          minHeight="280px"
          p={4}
        >
          <Box>Successfully confirmed your email address.</Box>
          <NextLink href="/profile" passHref legacyBehavior>
            <Button as="a">View Profile</Button>
          </NextLink>
        </BorderBox>
      </Box>
    </Layout>
  );
};

export default ConfirmEmailConfirmPage;
