import { useMutation } from 'graphql-hooks';
import { useEffect } from 'react';
import useForm from 'react-hook-form';
import { AuthUtils } from '../auth/auth.util';
import { GET_LOGIN_CODE_MUTATION } from './login-modal';
import { Box } from './ui/box';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Loader } from './ui/loader';
import { Modal } from './ui/modal';

interface ConfirmEmailModalProps {
  name: string;
  email: string;
  onConfirm: () => void;
  onClose: () => void;
}

const Form = Box.withComponent('form');

export const ConfirmEmailModal: React.FC<ConfirmEmailModalProps> = ({
  onConfirm,
  email,
  name,
  onClose
}) => {
  const {
    handleSubmit,
    register,
    setError,
    errors,
    formState: { isSubmitting }
  } = useForm<{
    logincode: string;
  }>();
  const [createLoginCode, { loading }] = useMutation<
    boolean,
    { email: string; name: string }
  >(GET_LOGIN_CODE_MUTATION);

  const sendEmail = () => {
    createLoginCode({
      variables: {
        email,
        name: name || ''
      }
    });
  };

  useEffect(sendEmail, []);

  const onSubmit = async (values: { logincode: string }) => {
    try {
      await AuthUtils.login(email, values.logincode);
      onConfirm();
    } catch (e) {
      setError('logincode', 'validate');
    }
  };

  return (
    <Modal title="Confirm Email" onClose={onClose}>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <Box marginBottom={3}>
          <Box color="textMuted">
            Almost there! We sent an email to you at{' '}
            <Box as="span" color="black">
              {email}
            </Box>
            . There you will find a secret code so you can confirm your email.
          </Box>
        </Box>
        <Box marginBottom={3}>
          <Input
            aria-label="Secret Sign In Code"
            name="logincode"
            placeholder="Secret Sign In Code"
            required
            ref={register({ required: true })}
            marginBottom={2}
          />
          <Box display="flex">
            {Object.keys(errors).length > 0 && (
              <Box color="danger">Incorrect sign in code, please try again</Box>
            )}
          </Box>
        </Box>
        <Box display="flex" justifyContent="flex-end">
          {isSubmitting || loading ? (
            <Box display="flex" alignItems="center" minHeight="44px">
              <Loader type="bar" />
            </Box>
          ) : (
            <Button>Create Group</Button>
          )}
        </Box>
      </Form>
    </Modal>
  );
};
