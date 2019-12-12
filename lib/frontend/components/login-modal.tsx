import { useMutation } from 'graphql-hooks';
import { useEffect, useState } from 'react';
import useForm from 'react-hook-form';
import { AuthUtils } from '../auth/auth.util';
import { Box } from './ui/box';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Link } from './ui/link';
import { Loader } from './ui/loader';
import { Modal } from './ui/modal';

const GET_LOGIN_CODE_MUTATION = `mutation createLoginCode($email: String!, $name: String) {
    createLoginCode(email: $email, name: $name)
 }`;

interface LoginModalProps {
  name?: string;
  email?: string;
  isLoading?: boolean;
  onLogin: () => void;
  onClose: () => void;
}

interface LoginFormProps {
  name?: string;
  email: string;
  isLoading?: boolean;
  onLogin: () => void;
}

const Form = Box.withComponent('form');

export const LoginForm: React.FC<LoginFormProps> = ({
  onLogin,
  email,
  name,
  isLoading
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

  const onSubmit = async (values: { logincode: string }) => {
    try {
      await AuthUtils.login(values.logincode);
      onLogin();
    } catch (e) {
      setError('logincode', 'validate');
    }
  };
  const sendEmail = () => {
    createLoginCode({ variables: { email, name: name || '' } });
  };

  useEffect(sendEmail, []);

  return (
    <Form onSubmit={handleSubmit(onSubmit)}>
      <Box marginBottom={3}>
        <Box>An email was sent to "{email}" with a secret sign in code</Box>
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
        {isSubmitting || loading || isLoading ? (
          <Box display="flex" alignItems="center" minHeight="44px">
            <Loader type="bar" />
          </Box>
        ) : (
          <Button>Sign In</Button>
        )}
      </Box>
    </Form>
  );
};

export const EmailForm: React.FC<{ onSubmit: (email: string) => void }> = ({
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
        <Box>Sign in to Givto using your email address</Box>
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
        <Button>Sign In</Button>
      </Box>
    </Form>
  );
};

export const LoginModal: React.FC<LoginModalProps> = ({
  onLogin,
  email: emailProp,
  name,
  onClose,
  isLoading
}) => {
  const [email, setEmail] = useState(emailProp);

  return (
    <Modal title="Sign In" onClose={onClose}>
      {email ? (
        <LoginForm
          isLoading={isLoading}
          name={name}
          email={email}
          onLogin={onLogin}
        />
      ) : (
        <EmailForm onSubmit={setEmail} />
      )}
    </Modal>
  );
};
