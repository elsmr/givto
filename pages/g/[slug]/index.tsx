import { EnrichedGroup, UserInput } from '@givto/api/graphql-schema';
import { AuthContext } from '@givto/frontend/auth/auth.util';
import { ErrorPage } from '@givto/frontend/components/error';
import { Header } from '@givto/frontend/components/header';
import { InviteModal } from '@givto/frontend/components/invite-modal';
import { ProfileButton } from '@givto/frontend/components/profile-button';
import { Avatar } from '@givto/frontend/components/ui/avatar';
import { Badge } from '@givto/frontend/components/ui/badge';
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
import { Edit2, Plus, Save, X } from 'react-feather';
import useForm from 'react-hook-form';

const GET_GROUP_QUERY = `query getGroup($slug: String!) {
    getGroup(slug: $slug) {
        name,
        slug,
        creator {
          id,
          email
        },
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
        maxWidth="100%"
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

const GroupPageContent: React.FC<{ slug: string }> = ({ slug }) => {
  const { user, isLoading: userLoading } = useContext(AuthContext);
  const { data: groupResult, loading: groupLoading } = useQuery<{
    getGroup: EnrichedGroup;
  }>(GET_GROUP_QUERY, {
    variables: { slug }
  });
  const [
    assignUsersMutation,
    { loading: assignmentLoading, data }
  ] = useMutation(START_ASSIGNMENT_MUTATION);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [invitedUsers, setInvitedUsers] = useState<UserInput[]>([]);

  if (groupLoading) {
    return <PageLoader key="loader" />;
  }

  if (!groupResult || !groupResult.getGroup) {
    return <ErrorPage statusCode={404} />;
  }

  const group = groupResult.getGroup;
  const assignedAt = data?.assignUsersInGroup?.assignedAt ?? group.assignedAt;
  const assignee = data?.assignUsersInGroup?.assignee ?? group.assignee;
  const isCreator = group.creator.id === user?.id;

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
              <Box>
                {/* <NextLink passHref href={`/g/${slug}/settings`}>
                  <IconButton as="a">
                    <Settings /> <Box px={2}>Settings</Box>
                  </IconButton>
                </NextLink> */}
                <ProfileButton />
              </Box>
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
            {!assignedAt && (
              <IconButton onClick={() => setShowInviteModal(true)}>
                <Plus /> <Box px={2}>Invite</Box>
              </IconButton>
            )}
          </Box>
          {[...group.users, ...invitedUsers].map(member => (
            <Box key={member.email} display="flex" alignItems="center" py={2}>
              <Avatar
                name={member.name}
                marginRight={2}
                size={36}
                fontSize={4}
              ></Avatar>
              <Box>
                <Box display="flex" alignItems="center">
                  <Box>{member.name}</Box>
                  {member.email === group.creator.email && (
                    <Badge mx={1}>🎅 Owner</Badge>
                  )}
                </Box>
                <Box color="textMuted" fontSize={1}>
                  {member.email}
                </Box>
              </Box>
            </Box>
          ))}
        </BorderBox>
      </LayoutWrapper>

      <LayoutWrapper marginBottom={4}>
        <WishlistForm slug={slug} wishlist={group.wishlist} />
      </LayoutWrapper>

      {assignee && (
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

      {isCreator && (
        <LayoutWrapper
          marginBottom={4}
          display="flex"
          flexDirection="column"
          alignItems="center"
        >
          {!assignmentLoading ? (
            <>
              <Button onClick={startAssignment} marginBottom={3}>
                {assignedAt ? 'Restart' : 'Start'} Secret Santa
              </Button>
              <Box color="textMuted" fontSize={1}>
                This action will assign gift givers and notify everyone by email
              </Box>
            </>
          ) : (
            <Loader type="box" />
          )}
        </LayoutWrapper>
      )}

      {showInviteModal && (
        <InviteModal
          slug={group.slug}
          onClose={() => setShowInviteModal(false)}
          onInvite={invitedUser => {
            setInvitedUsers(state => [...state, invitedUser]);
            setShowInviteModal(false);
          }}
        ></InviteModal>
      )}
    </Layout>
  );
};

const GroupPage: NextPage = () => {
  const { query, push, asPath } = useRouter();
  const { isInitialized, token } = useContext(AuthContext);

  if (!query.slug || !isInitialized) {
    return <PageLoader key="loader" />;
  }

  if (!token) {
    push(`/login?redirect=${asPath}`);
  }

  return <GroupPageContent slug={query.slug as string} />;
};

export default GroupPage;
