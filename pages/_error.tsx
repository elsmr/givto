import { ErrorPage } from '@/components/error-page';
import { loadMessages } from '@/messages/load';
import { captureUnderscoreErrorException } from '@sentry/nextjs';
import type { NextPage } from 'next';

const NextErrorPage: NextPage<{ statusCode: number }> = ({ statusCode }) => (
  <ErrorPage statusCode={statusCode} />
);

NextErrorPage.getInitialProps = async (context) => {
  // Render errors (server and browser) with status 500+; awaited so serverless doesn't drop it.
  await captureUnderscoreErrorException(context);
  const { res, err, locale } = context;
  return {
    statusCode: res?.statusCode ?? err?.statusCode ?? 500,
    messages: await loadMessages(locale, ['errors']),
  };
};

export default NextErrorPage;
