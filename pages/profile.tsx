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
import { NextPage } from 'next';
import Head from 'next/head';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { useContext, useEffect, useState } from 'react';
import { Save } from 'react-feather';
import useForm from 'react-hook-form';

const EXPANDED_USER_QUERY = `query getCurrentUser {
  getCurrentUser {
    id
    name
    email,
    groups {
      id
      name
      slug
      users {
        name
      }
    }
  }
}`;

const UPDATE_USER_MUTATION = `mutation updateUser($email: String!, $update: UserUpdate) {
  updateUser(email: $email, update: $update) {
    name
  }
}`;

const ProfilePage: NextPage = () => {
  const { data: userResult, loading } = useQuery<{
    getCurrentUser: EnrichedUser;
  }>(EXPANDED_USER_QUERY);
  const { register, handleSubmit } = useForm<{ name: string }>({
    mode: 'onBlur'
  });
  const router = useRouter();
  const { token } = useContext(AuthContext);
  const [updateUserMutation] = useMutation(UPDATE_USER_MUTATION);
  const [name, setName] = useState('');
  const user = userResult?.getCurrentUser;

  useEffect(() => {
    setName(user?.name);
  }, [user]);

  const onSubmit = (formValues: { name: string }) => {
    updateUserMutation({ variables: { email: user.email, update: { name } } });
    setName(formValues.name);
  };

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    router.push('/');
    return null;
  }

  return (
    <Layout display="flex" flexDirection="column">
      <Head>
        <title>Givto - {name}</title>
      </Head>
      <Box marginBottom={4}>
        <LayoutWrapper>
          <Header
            actions={
              <IconButton
                onClick={async () => {
                  await AuthUtils.logout(token);
                  router.push('/');
                }}
              >
                Logout
              </IconButton>
            }
          />
        </LayoutWrapper>
      </Box>
      <LayoutWrapper marginBottom={4}>
        <Box display="flex" justifyContent="center" marginBottom={3}>
          <Avatar name={name} size={128} fontSize={8} borderWidth={4} />
        </Box>
        <Box as="form" onSubmit={handleSubmit(onSubmit)}>
          <Box
            as="label"
            marginBottom={3}
            display="flex"
            flexDirection="column"
            alignItems="flex-start"
          >
            <Box
              as="span"
              bg="primary"
              color="white"
              py={1}
              px={2}
              borderColor="black"
              borderStyle="solid"
              borderWidth={1}
              fontSize={1}
              borderBottom="none"
            >
              Name
            </Box>
            <Box display="flex" width="100%">
              <Input
                flexGrow={1}
                name="name"
                ref={register({ required: true })}
                placeholder="Your Name"
                defaultValue={name}
                marginRight={2}
              />
              <IconButton>
                <Save size={16} /> <Box px={2}>Save</Box>
              </IconButton>
            </Box>
          </Box>
        </Box>
        <Box
          as="label"
          marginBottom={3}
          display="flex"
          flexDirection="column"
          alignItems="flex-start"
        >
          <Box
            as="span"
            bg="primary"
            color="white"
            py={1}
            px={2}
            borderColor="black"
            borderStyle="solid"
            borderWidth={1}
            fontSize={1}
            borderBottom="none"
          >
            Email (read-only)
          </Box>
          <Input
            name="email"
            readOnly
            placeholder="Your Email"
            defaultValue={user.email}
          />
        </Box>
      </LayoutWrapper>

      <LayoutWrapper>
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
              Groups
            </Box>
          </Box>
          {user.groups.map(group => (
            <NextLink key={group.id} href={`/g/${group.slug}`}>
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
                  fontSize={4}
                ></Avatar>
                <Box>
                  <Box>{group.name || 'Anonymous group'}</Box>
                  <Box color="textMuted" fontSize={1}>
                    {group.users.length} members
                  </Box>
                </Box>
              </Link>
            </NextLink>
          ))}
        </BorderBox>
      </LayoutWrapper>
    </Layout>
  );
};

export default ProfilePage;
