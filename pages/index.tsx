import styled from '@emotion/styled';
import { CreateGroupForm } from '@givto/frontend/components/create-group-form';
import { Header } from '@givto/frontend/components/header';
import { ProfileButton } from '@givto/frontend/components/profile-button';
import { BorderBox } from '@givto/frontend/components/ui/border-box';
import { Box } from '@givto/frontend/components/ui/box';
import { Layout, LayoutWrapper } from '@givto/frontend/components/ui/layout';
import { Link } from '@givto/frontend/components/ui/link';
import { NextPageContext } from 'next';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/router';
import React from 'react';
import AssignIllustration from '../assets/assign.svg';
import InviteIllustration from '../assets/invite.svg';
import { Footer } from '../lib/frontend/components/footer';

const HomePage = () => {
  const t = useTranslations('home');
  return (
    <Layout display="flex" flexDirection="column" justifyItems="stretch">
      <Box as="main">
        <Box marginBottom={4}>
          <Header bg="white" actions={<ProfileButton />} />
        </Box>

        <LayoutWrapper marginBottom={4}>
          <BorderBox p={4}>
            <Box as="h2" marginBottom={4} fontSize={5}>
              {t('tagline')}
            </Box>
            <CreateGroupForm />
          </BorderBox>
        </LayoutWrapper>

        <Box marginBottom={4} py={3}>
          <LayoutWrapper>
            <Box
              display="flex"
              flexWrap="wrap"
              alignItems="center"
              marginBottom={5}
            >
              <Box
                p={[4, 1]}
                paddingRight={[4, 5]}
                flexBasis={['100%', '50%']}
                order={[2, 1]}
              >
                <InviteIllustration style={{ width: '100%' }} />
              </Box>

              <Box flexBasis={['100%', '50%']} order={[1, 2]}>
                <Box as="h3" fontSize={5} marginBottom={3}>
                  {t('invite-friends.title')}
                </Box>

                <Box as="p" lineHeight="body" fontSize={3}>
                  {t('invite-friends.description')}
                </Box>
              </Box>
            </Box>
            <Box display="flex" flexWrap="wrap" alignItems="center">
              <Box paddingRight={[4, 5]} flexBasis={['100%', '50%']}>
                <Box as="h3" fontSize={5} marginBottom={3}>
                  {t('assign.title')}
                </Box>

                <Box as="p" lineHeight="body" fontSize={3}>
                  {t('assign.description')}
                </Box>
              </Box>

              <Box p={[4, 1]} flexBasis={['100%', '50%']}>
                <AssignIllustration style={{ width: '100% ' }} />
              </Box>
            </Box>
          </LayoutWrapper>
        </Box>
      </Box>
      <Footer />
    </Layout>
  );
};

export default HomePage;

export async function getStaticProps(context: NextPageContext) {
  const { locale, locales } = context;

  return {
    props: {
      locales,
      locale,
      messages: (await import(`../messages/${locale}.json`)).default,
    },
  };
}
