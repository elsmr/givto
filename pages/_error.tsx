import { ErrorPage } from '@givto/frontend/components/error';
import { NextPage, NextPageContext } from 'next';
import React from 'react';

export const NextErrorPage: NextPage<{ statusCode: number }> = ({
  statusCode,
}) => <ErrorPage statusCode={statusCode} />;

NextErrorPage.getInitialProps = async ({ res, err, locale }) => {
  const statusCode = res
    ? res.statusCode
    : err
    ? (err.statusCode as number)
    : 404;
  return {
    statusCode,
    // messages: (await import(`../messages/${locale}.json`)).default,
  };
};

export default NextErrorPage;
