import { AppShell } from '@/components/shell/app-shell';
import { MyWishlist } from '@/components/wishlist/my-wishlist';
import { loadMessages } from '@/messages/load';
import type { GetStaticProps } from 'next';
import { useTranslations } from 'next-intl';
import Head from 'next/head';

// Signed in only: a static shell, data loads on the client (37).
export default function WishlistPage() {
  const t = useTranslations('wishlist');
  return (
    <AppShell app>
      <Head>
        <title>{`${t('page-title')} · Givto`}</title>
      </Head>
      <MyWishlist />
    </AppShell>
  );
}

export const getStaticProps: GetStaticProps = async () => ({
  props: { messages: await loadMessages('en', ['wishlist']) },
});
