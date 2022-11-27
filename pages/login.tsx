import { EmailForm, LoginForm } from '@givto/frontend/components/login-modal';
import { BorderBox } from '@givto/frontend/components/ui/border-box';
import { Box } from '@givto/frontend/components/ui/box';
import { AuthContext } from '@givto/frontend/auth/auth.util';
import { Layout } from '@givto/frontend/components/ui/layout';
import { NextPage, NextPageContext } from 'next';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import React, { useContext, useState } from 'react';
import GivtoLogo from '../assets/givto-logo.svg';
import { useTranslations } from 'next-intl';
import { Footer } from '../lib/frontend/components/footer';

export const LoginPage: NextPage = () => {
  const { query, push } = useRouter();
  const [email, setEmail] = useState(query.email as string);
  const { isInitialized, user } = useContext(AuthContext);
  const t = useTranslations('login');
  if (isInitialized && user) {
    push('/profile');
  }

  return (
    <Layout>
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        p={[2, 3]}
        mb={4}
        mt="10vh"
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
            width="calc(100vw - 32px)"
            minWidth="320px"
            maxWidth="560px"
            p={4}
          >
            <Box
              css={{
                position: 'relative',
                overflow: 'hidden',
                minHeight: '200px',
              }}
            >
              <Box as="h2" mb={3}>
                {t('sign-in')}
              </Box>
              <Box>
                {email ? (
                  <LoginForm email={email} onLogin={() => {}} />
                ) : (
                  <EmailForm onSubmit={setEmail} />
                )}
              </Box>
            </Box>
          </BorderBox>
        </Box>
      </Box>
      <Footer />
    </Layout>
  );
};

export default LoginPage;

export async function getStaticProps(context: NextPageContext) {
  const locale = context.locale;

  return {
    props: {
      messages: (await import(`../messages/${locale}.json`)).default,
    },
  };
}
