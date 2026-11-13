import { ErrorPage } from '@/components/error-page';
import { loadMessages } from '@/messages/load';
import type { GetStaticProps } from 'next';

export default function NotFoundPage() {
  return <ErrorPage statusCode={404} />;
}

export const getStaticProps: GetStaticProps = async () => ({
  props: { messages: await loadMessages('en', ['errors']) },
});
