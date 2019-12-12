import { UserInput } from '@givto/api/graphql-schema';
import { useMutation } from 'graphql-hooks';
import useForm from 'react-hook-form';
import { Box } from './ui/box';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { InputLabel } from './ui/labeled-input';
import { Loader } from './ui/loader';
import { Modal } from './ui/modal';

const INVITE_USER_MUTATION = `mutation addUsersToGroup($slug: String!, $invitees: [UserInput]!) {
    addUsersToGroup(slug: $slug, invitees: $invitees) {
        slug
    }
 }`;

interface InviteModalProps {
  slug: string;
  onInvite: (invitee: UserInput) => void;
  onClose: () => void;
}

const Form = Box.withComponent('form');

export const InviteModal: React.FC<InviteModalProps> = ({
  onInvite,
  onClose,
  slug
}) => {
  const {
    handleSubmit,
    register,
    formState: { isSubmitting }
  } = useForm<{
    name: string;
    email: string;
  }>();
  const [inviteUsers, { loading }] = useMutation<
    boolean,
    { slug: string; invitees: UserInput[] }
  >(INVITE_USER_MUTATION);

  const onSubmit = async (values: { name: string; email: string }) => {
    const invitee = values;
    await inviteUsers({ variables: { slug, invitees: [invitee] } });
    onInvite(invitee);
  };

  return (
    <Modal title="Invite to group" onClose={onClose}>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <Box marginBottom={3}>
          <InputLabel label="Name">
            <Input
              name="name"
              placeholder="Your Friend's Name"
              required
              ref={register({ required: true })}
              marginBottom={2}
            />
          </InputLabel>

          <InputLabel label="Email Address">
            <Input
              type="email"
              name="email"
              placeholder="Your Friend's Email Address"
              required
              ref={register({ required: true })}
              marginBottom={2}
            />
          </InputLabel>
        </Box>
        <Box display="flex" justifyContent="flex-end">
          {isSubmitting || loading ? (
            <Box py={2}>
              <Loader type="bar" />
            </Box>
          ) : (
            <Button>Invite</Button>
          )}
        </Box>
      </Form>
    </Modal>
  );
};
