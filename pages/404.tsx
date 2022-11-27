import { ErrorPage } from '@givto/frontend/components/error';
import { NextPageContext } from 'next';
import React from 'react';

export const NotFoundPage = () => <ErrorPage statusCode={404} />;

export default NotFoundPage;

export async function getStaticProps(context: NextPageContext) {
  const locale = context.locale;

  return {
    props: {
      messages: (await import(`../messages/${locale}.json`)).default,
    },
  };
}
