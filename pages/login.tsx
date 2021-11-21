import { AuthContext } from '@givto/frontend/auth/auth.util';
import { EmailForm, LoginForm } from '@givto/frontend/components/login-modal';
import { BorderBox } from '@givto/frontend/components/ui/border-box';
import { Box } from '@givto/frontend/components/ui/box';
import { Layout } from '@givto/frontend/components/ui/layout';
import { NextPage } from 'next';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import React, { useContext, useState } from 'react';
import { animated, useTransition } from 'react-spring';
import GivtoLogo from '../assets/givto-logo.svg';

export const LoginPage: NextPage = () => {
  const { query, push } = useRouter();
  const [email, setEmail] = useState(query.email as string);
  const { isInitialized, user } = useContext(AuthContext);
  const transitions = useTransition(email, null, {
    from: {
      opacity: 0,
      transform: 'translate3d(60%,0,0)',
    },
    enter: { opacity: 1, transform: 'translate3d(0%,0,0)' },
    leave: { opacity: 0, transform: 'translate3d(-60%,0,0)' },
    initial: null,
  });

  if (isInitialized && user) {
    push('/profile');
  }

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
            <Box as="h2" marginBottom={3}>
              Sign In
            </Box>
            {transitions.map(({ item, props, key }) => (
              <animated.div
                key={key}
                style={{ position: 'absolute', left: 0, right: 0, ...props }}
              >
                {item ? (
                  <LoginForm email={email} onLogin={() => {}} />
                ) : (
                  <EmailForm onSubmit={setEmail} />
                )}
              </animated.div>
            ))}
          </Box>
        </BorderBox>
      </Box>
    </Layout>
  );
};

export default LoginPage;
