import { Group, User } from '@givto/api/graphql-schema';
import { AuthUtils } from '@givto/frontend/auth/auth-service';
import { EmailModal } from '@givto/frontend/components/email-modal';
import { Header } from '@givto/frontend/components/header';
import { LoginModal } from '@givto/frontend/components/login-modal';
import { Box } from '@givto/frontend/components/ui/box';
import { Layout, LayoutWrapper } from '@givto/frontend/components/ui/layout';
import { Loader } from '@givto/frontend/components/ui/loader';
import { Popover } from '@givto/frontend/components/ui/popover';
import { useQuery } from 'graphql-hooks';
import { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const GET_GROUP_QUERY = `query getGroup($slug: String!) {
    getGroup(slug: $slug) {
        name,
        slug,
        users {
            name,
            email
        }
    }
}`;

const GroupTitle: React.FC<{ group: Group }> = ({ group }) => {
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!group.name) {
      setIsEditing(true);
    }
  }, []);

  return (
    <Popover isOpen={isEditing} content={<Box>Boo</Box>}>
      <Box as="h2">{group.name}</Box>
    </Popover>
  );
};

const GroupPage: NextPage = () => {
  const { query } = useRouter();
  const {
    data: userResult,
    loading: userLoading,
    refetch: refetchUser
  } = useQuery<{
    getCurrentUser: User;
  }>(AuthUtils.AUTH_QUERY);
  const {
    data: groupResult,
    loading: groupLoading,
    refetch: refetchGroup
  } = useQuery<{
    getGroup: Group;
  }>(GET_GROUP_QUERY, {
    variables: { slug: query.slug }
  });
  const [email, setEmail] = useState('');
  const isLoading = userLoading || groupLoading;

  if (isLoading) {
    return <Loader type="box" />;
  }

  if (!groupResult || !groupResult.getGroup) {
    return (
      <Layout>
        <LayoutWrapper>
          <Header />
        </LayoutWrapper>
        {!email && <EmailModal onSubmit={setEmail} onClose={() => {}} />}
        {email && (
          <LoginModal
            email={email}
            onClose={() => {}}
            onLogin={() => {
              refetchUser();
              refetchGroup();
            }}
          />
        )}
      </Layout>
    );
  }

  const group = groupResult.getGroup;

  return (
    <Layout display="flex" flexDirection="column">
      <Head>
        <title>Givto: {group.name}</title>
      </Head>
      <Box marginBottom={4}>
        <LayoutWrapper>
          <Header
            title={<GroupTitle group={group} />}
            actions={<Box>Actions</Box>}
          />
        </LayoutWrapper>
      </Box>
      <LayoutWrapper marginBottom={4}>
        "{group.name}" {group.slug}
      </LayoutWrapper>
    </Layout>
  );
};

export default GroupPage;
