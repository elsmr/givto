import useEventListener from '@use-it/event-listener';
import { useMutation } from 'graphql-hooks';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/router';
import React, { ReactElement, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Box } from './ui/box';
import { Button } from './ui/button';
import { Input } from './ui/input';

export const GET_LOGIN_CODE_MUTATION = `mutation createLoginCode($email: String!, $name: String, $redirectUrl: String) {
    createLoginCode(email: $email, name: $name, redirectUrl: $redirectUrl)
 }`;

interface LoginFormProps {
  name?: string;
  email: string;
  isLoading?: boolean;
  infoMessage?: ReactElement;
  successMessage?: ReactElement;
  onLogin: () => void;
}

const Form = Box.withComponent('form');

export const LoginForm: React.FC<LoginFormProps> = ({
  onLogin,
  email,
  name,
  infoMessage,
  successMessage,
}) => {
  const [createLoginCode] = useMutation<
    boolean,
    { email: string; name: string; redirectUrl: string }
  >(GET_LOGIN_CODE_MUTATION);
  const { query } = useRouter();
  const t = useTranslations('login');
  const [isDone, setIsDone] = useState(false);

  const sendEmail = () => {
    createLoginCode({
      variables: {
        email,
        name: name || '',
        redirectUrl: (query.redirect as string) || '/',
      },
    });
  };

  useEffect(sendEmail, []);

  useEventListener('storage', (event) => {
    const storageEvent = event as any as StorageEvent;
    if (storageEvent.key === 'givto-access-token' && storageEvent.newValue) {
      setIsDone(true);
      onLogin();
    }
  });

  return (
    <Box my={3} lineHeight="body">
      {isDone ? (
        <Box>{successMessage || t('success')}</Box>
      ) : (
        <>
          <Box color="textMuted">
            {t('email-sent')}{' '}
            <Box as="span" color="black">
              {email}
            </Box>
            . {infoMessage || t('email-sent-hint')}
          </Box>
        </>
      )}
    </Box>
  );
};

export const EmailForm: React.FC<{ onSubmit: (email: string) => void }> = ({
  onSubmit,
}) => {
  const t = useTranslations('login');
  const { handleSubmit, register } = useForm<{
    email: string;
  }>();

  const onFormSubmit = async ({ email }: { email: string }) => {
    onSubmit(email);
  };

  return (
    <Form onSubmit={handleSubmit(onFormSubmit)}>
      <Box marginBottom={3}>
        <Box>{t('hint')}</Box>
      </Box>
      <Box marginBottom={3}>
        <Input
          type={t('email-label')}
          aria-label={t('email-label')}
          {...register('email', { required: true })}
          placeholder={t('email-placeholder')}
          required
          marginBottom={2}
        />
      </Box>
      <Box display="flex" justifyContent="flex-end">
        <Button>{t('sign-in')}</Button>
      </Box>
    </Form>
  );
};
