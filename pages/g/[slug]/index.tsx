import { EnrichedGroup, User } from '@givto/api/graphql-schema';
import { AuthUtils } from '@givto/frontend/auth/auth-service';
import { Header } from '@givto/frontend/components/header';
import { LoginModal } from '@givto/frontend/components/login-modal';
import { Avatar } from '@givto/frontend/components/ui/avatar';
import { BorderBox } from '@givto/frontend/components/ui/border-box';
import { Box } from '@givto/frontend/components/ui/box';
import { Button } from '@givto/frontend/components/ui/button';
import { IconButton } from '@givto/frontend/components/ui/icon-button';
import { Input } from '@givto/frontend/components/ui/input';
import { Layout, LayoutWrapper } from '@givto/frontend/components/ui/layout';
import { Link } from '@givto/frontend/components/ui/link';
import { PageLoader } from '@givto/frontend/components/ui/loader';
import { Popover } from '@givto/frontend/components/ui/popover';
import { useMutation, useQuery } from 'graphql-hooks';
import { NextPage } from 'next';
import Head from 'next/head';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Edit2, X } from 'react-feather';
import useForm from 'react-hook-form';

const GET_GROUP_QUERY = `query getGroup($slug: String!) {
    getGroup(slug: $slug) {
        name,
        slug,
        users {
            id,
            name,
            email
        }
    }
}`;

const SET_GROUP_NAME_MUTATION = `mutation setGroupName($slug: String!, $name: String!) {
  setGroupName(slug: $slug, name: $name) {
      name
  }
}`;

const GroupTitle: React.FC<{ group: EnrichedGroup }> = ({ group }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(group.name);
  const { handleSubmit, register } = useForm();
  const [setGroupName] = useMutation<{
    setGroupName: { name: string };
  }>(SET_GROUP_NAME_MUTATION);

  const onSubmit = (values: Record<string, string>) => {
    setGroupName({
      variables: { name: values['group-name'], slug: group.slug }
    });
    setName(values['group-name']);
    setIsEditing(false);
  };

  useEffect(() => {
    if (!group.name) {
      setIsEditing(true);
    }
  }, []);

  return !isEditing ? (
    <Box display="flex" alignItems="center">
      <Box as="h2" fontSize={5} marginRight={2}>
        {name}
      </Box>
      <IconButton onClick={() => setIsEditing(true)}>
        <Edit2 size={12} /> <Box marginLeft={1}>Edit</Box>
      </IconButton>
    </Box>
  ) : (
    <Popover isOpen={!name} content={<Box>Give your Group a name ✨</Box>}>
      <Box
        display="flex"
        alignItems="center"
        as="form"
        onSubmit={handleSubmit(onSubmit)}
      >
        <Input
          name="group-name"
          placeholder="Group Name"
          defaultValue={name}
          ref={register({ required: true })}
          marginRight={1}
        />
        {name && (
          <IconButton
            type="button"
            bg="danger"
            color="black"
            flexShrink={0}
            onClick={() => setIsEditing(false)}
          >
            <X size={12} /> <Box marginLeft={1}>Cancel</Box>
          </IconButton>
        )}
      </Box>
    </Popover>
  );
};

const GroupPageContent: React.FC<{ slug: string; email: string }> = ({
  slug,
  email
}) => {
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
    getGroup: EnrichedGroup;
  }>(GET_GROUP_QUERY, {
    variables: { slug }
  });
  const isLoading = userLoading || groupLoading;

  if (isLoading) {
    return <PageLoader />;
  }

  if (!groupResult || !groupResult.getGroup) {
    return (
      <Layout>
        <LayoutWrapper>
          <Header />
        </LayoutWrapper>

        <LoginModal
          email={email}
          onClose={() => {}}
          onLogin={() => {
            refetchUser();
            refetchGroup();
          }}
        />
      </Layout>
    );
  }

  const group = groupResult.getGroup;
  const user = userResult.getCurrentUser;

  return (
    <Layout display="flex" flexDirection="column">
      <Head>
        <title>Givto - {group.name || 'Unnamed Group'}</title>
      </Head>
      <Box marginBottom={4}>
        <LayoutWrapper>
          <Header
            title={<GroupTitle group={group} />}
            actions={
              <NextLink href="/profile">
                <Link
                  display="flex"
                  alignItems="center"
                  borderStyle="solid"
                  borderColor="black"
                  borderWidth={1}
                  p={2}
                  css={{ textDecoration: 'none' }}
                >
                  <Avatar name={user.name}></Avatar>
                  <Box px={2} color="black">
                    {user.name}
                  </Box>
                </Link>
              </NextLink>
            }
          />
        </LayoutWrapper>
      </Box>
      <LayoutWrapper marginBottom={4}>
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
              Members
            </Box>
            <Button>Invite</Button>
          </Box>
          {group.users.map(user => (
            <Box key={user.id} display="flex" alignItems="center" py={2}>
              <Avatar
                name={user.name}
                marginRight={2}
                size={36}
                fontSize={4}
              ></Avatar>
              <Box>
                <Box>{user.name} </Box>
                <Box color="textMuted" fontSize={1}>
                  {user.email}
                </Box>
              </Box>
            </Box>
          ))}
        </BorderBox>
      </LayoutWrapper>
    </Layout>
  );
};

const GroupPage: NextPage = () => {
  const { query } = useRouter();

  if (!query.slug) {
    return <PageLoader />;
  }

  return (
    <GroupPageContent
      slug={query.slug as string}
      email={query.email as string}
    />
  );
};

export default GroupPage;
