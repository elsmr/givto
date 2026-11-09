import { AuthUtils } from '@givto/frontend/auth/auth.util';
import type { NextPage } from 'next';
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
          console.log(e);
          push('/');
        }
      }
    };

    login();
  }, [query, push]);

  return null;
};

// Disable static generation for this page since it requires query params
export async function getServerSideProps(context: any) {
  const locale = context.locale || 'en';
  return {
    props: {
      messages: (await import(`../messages/${locale}.json`)).default,
    },
  };
}

export default LoginLandingPage;
