import useForm from 'react-hook-form';
import { Box } from './ui/box';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Modal } from './ui/modal';

interface EmailModalProps {
  onSubmit: (email: string) => void;
  onClose: () => void;
}

const Form = Box.withComponent('form');

export const EmailModal: React.FC<EmailModalProps> = ({
  onSubmit,
  onClose
}) => {
  const { handleSubmit, register, setError, errors } = useForm<{
    email: string;
  }>();

  const onFormSubmit = async ({ email }: { email: string }) => {
    onSubmit(email);
  };

  return (
    <Modal title="Login To Group" onClose={onClose}>
      <Form onSubmit={handleSubmit(onFormSubmit)}>
        <Box marginBottom={3}>
          <Box>Please input your email to access this group.</Box>
          <Box>Givto will send you a temporary login code</Box>
        </Box>
        <Box marginBottom={3}>
          <Input
            type="email"
            aria-label="Email"
            name="email"
            placeholder="Your Email"
            required
            ref={register({ required: true })}
            marginBottom={2}
          />
        </Box>
        <Box display="flex" justifyContent="flex-end">
          <Button>Send Email</Button>
        </Box>
      </Form>
    </Modal>
  );
};
