import type { JoinPreview } from '@/lib/server/join-preview';
import { useTranslations } from 'next-intl';
import Head from 'next/head';

/**
 * Server-rendered link preview for chat apps, which don't run JS (45). Keys match the app
 * head's defaults so these win. Unknown or revoked links get the generic preview.
 */
export const JoinMeta = ({ preview, origin }: { preview: JoinPreview | null; origin: string }) => {
  const t = useTranslations('join.meta');
  const title = preview
    ? t('title', { organizer: preview.organizerFirstName, group: preview.groupName })
    : t('generic-title');
  const description = preview?.kind && preview.kind !== 'secretSanta' ? t(`description-${preview.kind}`) : t('description');
  const image = `${origin}/givto-logo.png`;

  return (
    <Head>
      <title>{title}</title>
      <meta key="description" name="description" content={description} />
      <meta key="og:url" property="og:url" content={origin} />
      <meta key="og:title" property="og:title" content={title} />
      <meta key="og:description" property="og:description" content={description} />
      <meta key="og:image" property="og:image" content={image} />
      <meta key="twitter:card" property="twitter:card" content="summary" />
      <meta key="twitter:url" property="twitter:url" content={origin} />
      <meta key="twitter:title" property="twitter:title" content={title} />
      <meta key="twitter:description" property="twitter:description" content={description} />
      <meta key="twitter:image" property="twitter:image" content={image} />
    </Head>
  );
};
