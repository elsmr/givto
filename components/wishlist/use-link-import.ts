import { useTRPCClient } from '@/lib/client/trpc';
import { TRPCClientError } from '@trpc/client';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useErrorMessage } from './use-error-message';
import type { ImportedWish } from './wish-draft';

/**
 * Reads a link's page with the server (39, 73). A page we can't read (many shops block servers) still
 * gives the link, titled from its URL; an address that can't be used gives `undefined`, the reason in `notice`.
 */
export const useLinkImport = () => {
  const t = useTranslations('wishlist.import');
  const client = useTRPCClient();
  const errorMessage = useErrorMessage();
  const [notice, setNotice] = useState('');
  // A count, not a flag: on save, several links are read at once.
  const [reading, setReading] = useState(0);

  const read = async (url: string): Promise<ImportedWish | undefined> => {
    setNotice('');
    setReading((count) => count + 1);
    try {
      const product = await client.import.fromUrl.mutate({ url });
      setNotice(t('added'));
      return product;
    } catch (error) {
      const data = error instanceof TRPCClientError ? error.data : undefined;
      if (data?.appCode === 'IMPORT_BLOCKED' || data?.appCode === 'INVALID_INPUT') return void setNotice(t('blocked'));
      if (data?.appCode !== 'IMPORT_FAILED') return void setNotice(errorMessage(error));
      const { url: kept = url, title } = (data.details ?? {}) as { url?: string; title?: string };
      setNotice(t('added'));
      return { url: kept, ...(title && { title }) };
    } finally {
      setReading((count) => count - 1);
    }
  };

  return { read, reading: reading > 0, notice, added: notice === t('added') };
};
