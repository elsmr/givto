import { User } from '@givto/api/graphql-schema';
import { AuthUtils } from '@givto/frontend/auth/auth-service';
import { Header } from '@givto/frontend/components/header';
import { Avatar } from '@givto/frontend/components/ui/avatar';
import { Box } from '@givto/frontend/components/ui/box';
import { Input } from '@givto/frontend/components/ui/input';
import { Layout, LayoutWrapper } from '@givto/frontend/components/ui/layout';
import { Loader } from '@givto/frontend/components/ui/loader';
import { useQuery } from 'graphql-hooks';
import { NextPage } from 'next';
import Head from 'next/head';
import useForm from 'react-hook-form';

const ProfilePage: NextPage = () => {
  const { data: userResult, loading } = useQuery<{
    getCurrentUser: User;
  }>(AuthUtils.AUTH_QUERY);
  const { register, handleSubmit } = useForm({ mode: 'onBlur' });

  const onSubmit = () => {};

  if (loading) {
    return <Loader type="box" />;
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
        <Avatar name={user.name} />
        <Box as="form" onSubmit={handleSubmit(onSubmit)}>
          <Input
            ref={register({ minLength: 1 })}
            placeholder="Your Name"
            defaultValue={user.name}
          />
          <Input
            ref={register({ minLength: 1 })}
            placeholder="Your Email"
            defaultValue={user.name}
          />
        </Box>
      </LayoutWrapper>
    </Layout>
  );
};

export default GroupPage;
