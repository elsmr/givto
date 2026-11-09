import { ErrorPage } from '@givto/frontend/components/error';
import type { GetStaticPropsContext } from 'next';
import React from 'react';

export const NotFoundPage = () => <ErrorPage statusCode={404} />;

export default NotFoundPage;

export async function getStaticProps(context: GetStaticPropsContext) {
  const locale = context.locale || 'en';

  return {
    props: {
      messages: (await import(`../messages/${locale}.json`)).default,
    },
  };
}
