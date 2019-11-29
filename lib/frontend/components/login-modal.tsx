import { useMutation } from 'graphql-hooks';
import unfetch from 'isomorphic-unfetch';
import { useEffect } from 'react';
import useForm from 'react-hook-form';
import { Box } from './ui/box';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Link } from './ui/link';
import { Modal } from './ui/modal';

const GET_LOGIN_CODE_MUTATION = `mutation createLoginCode($email: String!) {
    createLoginCode(email: $email)
 }`;

interface LoginModalProps {
  email: string;
  onLogin: () => void;
  onClose: () => void;
}

const Form = Box.withComponent('form');

export const LoginModal: React.FC<LoginModalProps> = ({
  onLogin,
  email,
  onClose
}) => {
  const { handleSubmit, register, setError, errors } = useForm<{
    logincode: string;
  }>();
  const [createLoginCode] = useMutation<boolean, { email: string }>(
    GET_LOGIN_CODE_MUTATION
  );

  const onSubmit = async (values: { logincode: string }) => {
    try {
      const response = await unfetch('/api/auth/login', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ loginCode: values.logincode })
      });

      if (response.status !== 200) {
        throw new Error();
      }

      const body = await response.json();
    } catch (e) {
      setError('logincode', 'validate');
    }
  };
  const sendEmail = () => {
    createLoginCode({ variables: { email } });
  };

  useEffect(sendEmail, []);

  return (
    <Modal title="Confirm Email Address" onClose={onClose}>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <Box marginBottom={3}>
          <Box>We sent an email to "{email}" with a secret login code</Box>
          <Box>Please enter it here</Box>
        </Box>
        <Box marginBottom={3}>
          <Input
            aria-label="Login Code"
            name="logincode"
            placeholder="Secret Login Code"
            required
            ref={register({ required: true })}
            marginBottom={2}
          />
          <Box display="flex" justifyContent="space-between">
            <Link as="span" style={{ cursor: 'pointer' }} onClick={sendEmail}>
              Retry
            </Link>
            {Object.keys(errors).length > 0 && (
              <Box color="danger">Incorrect login code, please try again</Box>
            )}
          </Box>
        </Box>
        <Box display="flex" justifyContent="flex-end">
          <Button>Confirm</Button>
        </Box>
      </Form>
    </Modal>
  );
};
