import { EmailForm, LoginForm } from '@givto/frontend/components/login-modal';
import { BorderBox } from '@givto/frontend/components/ui/border-box';
import { Box } from '@givto/frontend/components/ui/box';
import { Layout } from '@givto/frontend/components/ui/layout';
import { NextPage } from 'next';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import React, { useState } from 'react';
import GivtoLogo from '../assets/givto-logo.svg';

export const LoginPage: NextPage = () => {
  const { query, push } = useRouter();
  const [email, setEmail] = useState(query.email as string);

  return (
    <Layout display="flex" justifyContent="center" alignItems="center">
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        paddingBottom={6}
      >
        <NextLink href="/" passHref>
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
        <BorderBox width="100vw" minWidth="320px" maxWidth="560px" p={4}>
          <Box as="h2" marginBottom={3}>
            Sign In
          </Box>
          {email ? (
            <LoginForm
              name={name}
              email={email}
              onLogin={() => {
                push((query.redirect as string) || '/').then(() =>
                  window.scrollTo(0, 0)
                );
              }}
            />
          ) : (
            <EmailForm onSubmit={setEmail} />
          )}
        </BorderBox>
      </Box>
    </Layout>
  );
};

export default LoginPage;
