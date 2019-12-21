import { AuthUtils } from '@givto/frontend/auth/auth.util';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export const LoginLandingPage: NextPage = () => {
  const { push, query } = useRouter();

  useEffect(() => {
    const login = async () => {
      if (query.email && query.code) {
        try {
          const { redirectUrl } = await AuthUtils.login(
            query.email as string,
            query.code as string
          );

          push(redirectUrl || '/');
        } catch (e) {
          push('/');
        }
      }
    };

    login();
  }, [query]);

  return null;
};

export default LoginLandingPage;
