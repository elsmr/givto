import { loadMessages } from '@/messages/load';
import type { GetStaticProps } from 'next';

export { default } from '../privacy';

export const getStaticProps: GetStaticProps = async () => ({
  props: { locale: 'nl', messages: await loadMessages('nl', ['privacy', 'seo']) },
});
