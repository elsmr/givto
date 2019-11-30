import { EnrichedUser } from '@givto/api/graphql-schema';
import { Header } from '@givto/frontend/components/header';
import { Avatar } from '@givto/frontend/components/ui/avatar';
import { BorderBox } from '@givto/frontend/components/ui/border-box';
import { Box } from '@givto/frontend/components/ui/box';
import { Input } from '@givto/frontend/components/ui/input';
import { Layout, LayoutWrapper } from '@givto/frontend/components/ui/layout';
import { Link } from '@givto/frontend/components/ui/link';
import { PageLoader } from '@givto/frontend/components/ui/loader';
import { useQuery } from 'graphql-hooks';
import { NextPage } from 'next';
import Head from 'next/head';
import NextLink from 'next/link';
import useForm from 'react-hook-form';

const EXPANDED_USER_QUERY = `query getCurrentUser {
  getCurrentUser {
    id
    name
    email,
    groups {
      name
      slug
      users {
        name
      }
    }
  }
}`;

const ProfilePage: NextPage = () => {
  const { data: userResult, loading } = useQuery<{
    getCurrentUser: EnrichedUser;
  }>(EXPANDED_USER_QUERY);
  const { register, handleSubmit } = useForm({ mode: 'onBlur' });

  const onSubmit = () => {};

  if (loading) {
    return <PageLoader />;
  }

  const user = userResult.getCurrentUser;

  return (
    <Layout display="flex" flexDirection="column">
      <Head>
        <title>Givto - {user.name}</title>
      </Head>
      <Box marginBottom={4}>
        <LayoutWrapper>
          <Header />
        </LayoutWrapper>
      </Box>
      <LayoutWrapper marginBottom={4}>
        <Box display="flex" justifyContent="center">
          <Avatar name={user.name} size={128} fontSize={8} />
        </Box>
        <Box as="form" onSubmit={handleSubmit(onSubmit)}>
          <Box display="block" as="label" htmlFor="name" marginBottom={2}>
            <Box>Name</Box>
            <Input
              name="name"
              ref={register({ minLength: 1 })}
              placeholder="Your Name"
              defaultValue={user.name}
            />
          </Box>
          <Box display="block" as="label" htmlFor="email" marginBottom={2}>
            <Box>Email</Box>
            <Input
              name="email"
              ref={register({ minLength: 1 })}
              placeholder="Your Email"
              defaultValue={user.email}
            />
          </Box>
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
                  name={group.name}
                  marginRight={2}
                  size={36}
                  fontSize={4}
                ></Avatar>
                <Box>
                  <Box>{group.name}</Box>
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
