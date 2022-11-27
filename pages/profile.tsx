import { EnrichedUser } from '@givto/api/graphql-schema';
import { AuthContext, AuthUtils } from '@givto/frontend/auth/auth.util';
import { Header } from '@givto/frontend/components/header';
import { Avatar } from '@givto/frontend/components/ui/avatar';
import { BorderBox } from '@givto/frontend/components/ui/border-box';
import { Box } from '@givto/frontend/components/ui/box';
import { IconButton } from '@givto/frontend/components/ui/icon-button';
import { Input } from '@givto/frontend/components/ui/input';
import { Layout, LayoutWrapper } from '@givto/frontend/components/ui/layout';
import { Link } from '@givto/frontend/components/ui/link';
import { PageLoader } from '@givto/frontend/components/ui/loader';
import { useMutation, useQuery } from 'graphql-hooks';
import { NextPage, NextPageContext } from 'next';
import { useTranslations } from 'next-intl';
import Head from 'next/head';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import React, { useContext, useEffect, useState } from 'react';
import { Plus, Save } from 'react-feather';
import { useForm } from 'react-hook-form';
import { Footer } from '../lib/frontend/components/footer';
import { InputLabel } from '../lib/frontend/components/ui/labeled-input';

const EXPANDED_USER_QUERY = `query getCurrentUser {
  getCurrentUser {
    id
    name
    email,
    groups {
      id
      name
      slug
      userCount
    }
  }
}`;

const UPDATE_USER_MUTATION = `mutation updateUser($email: String!, $update: UserUpdate!) {
  updateUser(email: $email, update: $update) {
    name
  }
}`;

const ProfilePage: NextPage = () => {
  const { data: userResult, loading } = useQuery<{
    getCurrentUser: EnrichedUser;
  }>(EXPANDED_USER_QUERY);
  const { register, handleSubmit } = useForm<{ name: string }>({
    mode: 'onBlur',
  });
  const router = useRouter();
  const { token } = useContext(AuthContext);
  const [updateUserMutation] = useMutation(UPDATE_USER_MUTATION);
  const [name, setName] = useState('');
  const user = userResult?.getCurrentUser;
  const t = useTranslations('profile-page');

  useEffect(() => {
    if (user?.name) {
      setName(user?.name);
    }
  }, [user]);

  const onSubmit = (formValues: { name: string }) => {
    updateUserMutation({
      variables: { email: user?.email, update: { name: formValues.name } },
    });
    setName(formValues.name);
  };

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    router.push({ pathname: '/login', query: { redirect: '/profile' } });
    return null;
  }

  return (
    <Layout>
      <Head>
        <title>Givto - {name}</title>
      </Head>
      <Box as="main">
        <Box marginBottom={4}>
          <Header
            actions={
              <IconButton
                onClick={async () => {
                  await AuthUtils.logout(token);
                  router.push('/');
                }}
              >
                {t('logout')}
              </IconButton>
            }
          />
        </Box>
        <LayoutWrapper marginBottom={4}>
          <Box display="flex" justifyContent="center" marginBottom={3}>
            <Avatar name={name} size={128} fontSize={8} borderWidth={4} />
          </Box>
          <Box as="form" onSubmit={handleSubmit(onSubmit)}>
            <InputLabel mb={3} label={t('name')}>
              <Box display="flex" width="100%" alignItems="center">
                <Input
                  flexGrow={1}
                  {...register('name', { required: true })}
                  placeholder={t('name-placeholder')}
                  defaultValue={name}
                  marginRight={2}
                />
                <IconButton>
                  <Save size={16} /> <Box px={2}>{t('save')}</Box>
                </IconButton>
              </Box>
            </InputLabel>
          </Box>
          <InputLabel label={t('email')}>
            <Input
              name="email"
              readOnly
              placeholder={t('email-placeholder')}
              defaultValue={user.email}
            />
          </InputLabel>
        </LayoutWrapper>

        <LayoutWrapper mb={4}>
          <BorderBox p={3}>
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              borderBottomStyle="solid"
              borderColor="black"
              borderWidth={1}
              paddingBottom={2}
              marginBottom={3}
            >
              <Box as="h3" fontSize={4} marginRight={2}>
                {t('groups')}
              </Box>
              <NextLink href="/" passHref legacyBehavior>
                <IconButton as="a">
                  <Plus size={16} /> <Box px={2}>{t('add-group')}</Box>
                </IconButton>
              </NextLink>
            </Box>
            {user.groups.map((group) => (
              <NextLink
                key={group.id}
                href={`/g/${group.slug}`}
                passHref
                legacyBehavior
              >
                <Link
                  display="flex"
                  alignItems="center"
                  py={2}
                  color="black"
                  css={{ textDecoration: 'none' }}
                >
                  <Avatar
                    name={group.name || 'A'}
                    marginRight={2}
                    size={36}
                  ></Avatar>
                  <Box>
                    <Box>{group.name || 'Anonymous group'}</Box>
                    <Box color="textMuted" fontSize={1}>
                      {t('members', { count: group.userCount })}
                    </Box>
                  </Box>
                </Link>
              </NextLink>
            ))}
          </BorderBox>
        </LayoutWrapper>
      </Box>
      <Footer />
    </Layout>
  );
};

export default ProfilePage;

export async function getStaticProps(context: NextPageContext) {
  const locale = context.locale;

  return {
    props: {
      messages: (await import(`../messages/${locale}.json`)).default,
    },
  };
}
