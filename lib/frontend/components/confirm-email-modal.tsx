import { useMutation } from 'graphql-hooks';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
  onClose,
}) => {
  const {
    handleSubmit,
    register,
    setError,
    formState: { isSubmitting, errors },
  } = useForm<{
    logincode: string;
  }>();
  const t = useTranslations('confirm-email-modal');
  const [createLoginCode, { loading }] = useMutation<
    boolean,
    { email: string; name: string }
  >(GET_LOGIN_CODE_MUTATION);

  const sendEmail = () => {
    createLoginCode({
      variables: {
        email,
        name: name || '',
      },
    });
  };

  useEffect(sendEmail, []);

  const onSubmit = async (values: { logincode: string }) => {
    try {
      await AuthUtils.login(email, values.logincode);
      onConfirm();
    } catch (e) {
      setError('logincode', { type: 'validate' });
    }
  };

  return (
    <Modal title="Confirm Email" onClose={onClose}>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <Box marginBottom={3}>
          <Box color="textMuted">
            {t('email-sent')}{' '}
            <Box as="span" color="black">
              {email}
            </Box>
            . {t('email-sent-hint')}
          </Box>
        </Box>
        <Box marginBottom={3}>
          <Input
            aria-label={t('code-label')}
            {...register('logincode', { required: true })}
            placeholder={t('code-label')}
            required
            marginBottom={2}
          />
          <Box display="flex">
            {Object.keys(errors).length > 0 && (
              <Box color="danger">{t('error')}</Box>
            )}
          </Box>
        </Box>
        <Box display="flex" justifyContent="flex-end">
          {isSubmitting || loading ? (
            <Box display="flex" alignItems="center" minHeight="44px">
              <Loader type="bar" />
            </Box>
          ) : (
            <Button>{t('create')}</Button>
          )}
        </Box>
      </Form>
    </Modal>
  );
};
