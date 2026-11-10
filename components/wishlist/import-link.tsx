import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation } from '@tanstack/react-query';
import { TRPCClientError } from '@trpc/client';
import { Link2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type ClipboardEvent } from 'react';
import { shopName } from './shop-name';
import { useErrorMessage } from './use-error-message';
import type { ImportedWish } from './wish-draft';

interface ImportLinkProps {
  id: string;
  onImported: (product: ImportedWish) => void;
}

const isHttpUrl = (text: string) => /^https?:\/\/\S+$/i.test(text) && URL.canParse(text);

/**
 * "Paste a link" at the top of the wish form (39, 73): the server reads the page and the link
 * joins the wish. Pasting imports right away. Not a form of its own: it sits inside the wish form.
 */
export const ImportLink = ({ id, onImported }: ImportLinkProps) => {
  const t = useTranslations('wishlist.import');
  const trpc = useTRPC();
  const errorMessage = useErrorMessage();
  const [url, setUrl] = useState('');
  const [notice, setNotice] = useState('');
  const importUrl = useMutation(trpc.import.fromUrl.mutationOptions());

  const run = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || importUrl.isPending) return;
    if (!isHttpUrl(trimmed)) return setNotice(t('blocked'));
    setNotice('');
    importUrl.mutate(
      { url: trimmed },
      {
        onSuccess: (product) => {
          setUrl('');
          onImported(product);
          setNotice(t('done'));
        },
        onError: (error) => {
          const data = error instanceof TRPCClientError ? error.data : undefined;
          if (data?.appCode === 'IMPORT_BLOCKED' || data?.appCode === 'INVALID_INPUT') return setNotice(t('blocked'));
          if (data?.appCode !== 'IMPORT_FAILED') return setNotice(errorMessage(error));
          const { url: kept = trimmed, title, reason } = (data.details ?? {}) as { url?: string; title?: string; reason?: string };
          setUrl('');
          onImported({ url: kept, ...(title && { title }) });
          setNotice(reason === 'bot_wall' ? t('bot-wall', { shop: shopName(kept) }) : t('failed'));
        },
      }
    );
  };

  const paste = (event: ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData('text').trim();
    if (!isHttpUrl(text)) return;
    event.preventDefault();
    setUrl(text);
    run(text);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="@container flex flex-col gap-2 @md:flex-row @md:items-end">
        <Field className="flex-1">
          <FieldLabel htmlFor={`${id}-link`}>{t('label')}</FieldLabel>
          <Input
            id={`${id}-link`}
            type="url"
            inputMode="url"
            maxLength={2000}
            placeholder={t('placeholder')}
            aria-describedby={`${id}-link-hint`}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            onPaste={paste}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              run(url);
            }}
          />
        </Field>
        <Button type="button" variant="neutral" className="w-fit" disabled={importUrl.isPending} onClick={() => run(url)}>
          <Link2 aria-hidden="true" />
          {importUrl.isPending ? t('busy') : t('submit')}
        </Button>
      </div>
      <FieldDescription id={`${id}-link-hint`}>{t('hint')}</FieldDescription>
      <p role="status" className="text-sm font-semibold empty:hidden">
        {notice}
      </p>
    </div>
  );
};
