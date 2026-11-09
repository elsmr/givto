import { ErrorPage } from '@/components/error-page';
import { loadMessages } from '@/messages/load';
import type { NextPage } from 'next';

const NextErrorPage: NextPage<{ statusCode: number }> = ({ statusCode }) => (
  <ErrorPage statusCode={statusCode} />
);

NextErrorPage.getInitialProps = async ({ res, err, locale }) => ({
  statusCode: res?.statusCode ?? err?.statusCode ?? 500,
  messages: await loadMessages(locale, ['errors']),
});

export default NextErrorPage;
