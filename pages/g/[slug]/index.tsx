import { EnrichedGroup } from '@givto/api/graphql-schema';
import { AuthContext, AuthUtils } from '@givto/frontend/auth/auth.util';
import { Header } from '@givto/frontend/components/header';
import { LoginModal } from '@givto/frontend/components/login-modal';
import { ProfileButton } from '@givto/frontend/components/profile-button';
import { Avatar } from '@givto/frontend/components/ui/avatar';
import { BorderBox } from '@givto/frontend/components/ui/border-box';
import { Box } from '@givto/frontend/components/ui/box';
import { Button } from '@givto/frontend/components/ui/button';
import { IconButton } from '@givto/frontend/components/ui/icon-button';
import { Input } from '@givto/frontend/components/ui/input';
import { Layout, LayoutWrapper } from '@givto/frontend/components/ui/layout';
import { Loader, PageLoader } from '@givto/frontend/components/ui/loader';
import { Popover } from '@givto/frontend/components/ui/popover';
import { Wishlist } from '@givto/frontend/components/wishlist';
import { WishlistForm } from '@givto/frontend/components/wishlist-form';
import { useMutation, useQuery } from 'graphql-hooks';
import { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useContext, useEffect, useState } from 'react';
import { Edit2, Save, X } from 'react-feather';
import useForm from 'react-hook-form';

const GET_GROUP_QUERY = `query getGroup($slug: String!) {
    getGroup(slug: $slug) {
        name,
        slug,
        assignedAt,
        users {
            id,
            name,
            email
        },
        wishlist {
          title
          description
        },
        assignee {
          user {
            name
          }
          wishlist {
            title
            description
          }
        }
    }
}`;

const SET_GROUP_NAME_MUTATION = `mutation setGroupName($slug: String!, $name: String!) {
  setGroupName(slug: $slug, name: $name) {
      name
  }
}`;

const START_ASSIGNMENT_MUTATION = `mutation assignUsersInGroup($slug: String!) {
  assignUsersInGroup(slug: $slug) {
      assignee {
        user {
          name
        },
        wishlist {
          title
          description
        },
      },
      assignedAt
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
      <Box
        as="h2"
        fontSize={5}
        marginRight={2}
        maxWidth="300px"
        overflow="hidden"
        css={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      >
        {name}
      </Box>
      <IconButton
        size="small"
        flexShrink={0}
        onClick={() => setIsEditing(true)}
      >
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
        <IconButton size="small" type="submit" flexShrink={0} marginRight={1}>
          <Save size={12} /> <Box marginLeft={1}>Save</Box>
        </IconButton>
        {name && (
          <IconButton
            size="small"
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
  const router = useRouter();
  const { user, isLoading: userLoading } = useContext(AuthContext);
  const {
    data: groupResult,
    loading: groupLoading,
    refetch: refetchGroup
  } = useQuery<{
    getGroup: EnrichedGroup;
  }>(GET_GROUP_QUERY, {
    variables: { slug }
  });
  const [
    assignUsersMutation,
    { loading: assignmentLoading, data }
  ] = useMutation(START_ASSIGNMENT_MUTATION);

  if (groupLoading) {
    return <PageLoader key="loader" />;
  }

  if (!groupResult || !groupResult.getGroup) {
    return (
      <Layout>
        <LayoutWrapper>
          <Header />
        </LayoutWrapper>

        <LoginModal
          email={email}
          onClose={() => router.push('/')}
          onLogin={() => {
            refetchGroup();
          }}
        />
      </Layout>
    );
  }

  const group = groupResult.getGroup;
  const assignedAt = data?.assignUsersInGroup?.assignedAt ?? group.assignedAt;
  const assignee = data?.assignUsersInGroup?.assignee ?? group.assignee;

  const startAssignment = () => {
    assignUsersMutation({ variables: { slug } });
  };

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
              <ProfileButton
                user={user}
                isLoading={userLoading}
                onLogin={() => {}}
              />
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
            {/* <Button>Invite</Button> */}
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

      <LayoutWrapper marginBottom={4}>
        <WishlistForm slug={slug} wishlist={group.wishlist} />
      </LayoutWrapper>

      {!assignedAt && (
        <LayoutWrapper marginBottom={4} display="flex" justifyContent="center">
          {!assignmentLoading ? (
            <Button onClick={startAssignment}>Start Secret Santa</Button>
          ) : (
            <Loader type="box" />
          )}
        </LayoutWrapper>
      )}

      {group.assignee && (
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
                {assignee.user.name}'s Wishlist
              </Box>
            </Box>
            <Wishlist wishlist={assignee.wishlist} />
            {assignee.wishlist.length === 0 && (
              <Box
                minHeight="250px"
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
              >
                <Box as="h4" fontWeight="normal" fontSize={3} marginBottom={2}>
                  {assignee.user.name} has not entered a wishlist yet
                </Box>
                <Box>
                  Gently nudge him or her to add some items to their wishlist 😉
                </Box>
              </Box>
            )}
          </BorderBox>
        </LayoutWrapper>
      )}
    </Layout>
  );
};

const GroupPage: NextPage = () => {
  const { query } = useRouter();
  const [checkedInvite, setCheckedInvite] = useState(false);

  useEffect(() => {
    console.log('start');
    const login = async () => {
      if (query.slug) {
        if (query.invite) {
          console.log(query.invite);
          try {
            const token = await AuthUtils.login(query.invite as string);
            console.log('login success', token);
          } catch (e) {}
        }
        console.log('passed');

        setCheckedInvite(true);
      }
    };
    login();
  }, [query]);

  if (!query.slug || !checkedInvite) {
    return <PageLoader key="loader" />;
  }

  return (
    <GroupPageContent
      slug={query.slug as string}
      email={query.email as string}
    />
  );
};

export default GroupPage;
