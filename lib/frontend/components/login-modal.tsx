import { useMutation } from 'graphql-hooks';
import { useEffect, useState } from 'react';
import useForm from 'react-hook-form';
import { AuthUtils } from '../auth/auth.util';
import { Box } from './ui/box';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Link } from './ui/link';
import { Modal } from './ui/modal';

const GET_LOGIN_CODE_MUTATION = `mutation createLoginCode($email: String!) {
    createLoginCode(email: $email)
 }`;

interface LoginModalProps {
  email?: string;
  onLogin: () => void;
  onClose: () => void;
}

interface LoginFormProps {
  email: string;
  onLogin: () => void;
}

const Form = Box.withComponent('form');

const LoginForm: React.FC<LoginFormProps> = ({ onLogin, email }) => {
  const { handleSubmit, register, setError, errors } = useForm<{
    logincode: string;
  }>();
  const [createLoginCode] = useMutation<boolean, { email: string }>(
    GET_LOGIN_CODE_MUTATION
  );

  const onSubmit = async (values: { logincode: string }) => {
    try {
      await AuthUtils.login(values.logincode);
      onLogin();
    } catch (e) {
      setError('logincode', 'validate');
    }
  };
  const sendEmail = () => {
    createLoginCode({ variables: { email } });
  };

  useEffect(sendEmail, []);

  return (
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
  );
};

const EmailForm: React.FC<{ onSubmit: (email: string) => void }> = ({
  onSubmit
}) => {
  const { handleSubmit, register } = useForm<{
    email: string;
  }>();

  const onFormSubmit = async ({ email }: { email: string }) => {
    onSubmit(email);
  };

  return (
    <Form onSubmit={handleSubmit(onFormSubmit)}>
      <Box marginBottom={3}>
        <Box>Please input your email</Box>
        <Box>
          Givto will send you a temporary login code, no passwords required!
        </Box>
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
  );
};

export const LoginModal: React.FC<LoginModalProps> = ({
  onLogin,
  email: emailProp,
  onClose
}) => {
  const [email, setEmail] = useState(emailProp);

  return (
    <Modal title={email ? 'Confirm Email Address' : 'Login'} onClose={onClose}>
      {email ? (
        <LoginForm email={email} onLogin={onLogin} />
      ) : (
        <EmailForm onSubmit={setEmail} />
      )}
    </Modal>
  );
};
