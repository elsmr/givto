import { loadMessages } from '@/messages/load';
import type { GetStaticProps } from 'next';

import { ownerContact } from '../privacy';

export { default } from '../privacy';

export const getStaticProps: GetStaticProps = async () => ({
  props: { locale: 'nl', messages: await loadMessages('nl', ['privacy', 'seo']), owner: ownerContact() },
});
