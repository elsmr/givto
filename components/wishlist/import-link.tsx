import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation } from '@tanstack/react-query';
import { TRPCClientError } from '@trpc/client';
import { Link2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useImperativeHandle, useState, type ClipboardEvent, type Ref } from 'react';
import { useErrorMessage } from './use-error-message';
import type { ImportedWish } from './wish-draft';

/** Imports what's still typed in the field (when the wish is saved): `false` if it couldn't, with the reason shown. */
export interface ImportLinkHandle {
  importTyped: () => Promise<ImportedWish | false | undefined>;
  /** A link pasted somewhere else in the form (the wish field): import it here. */
  importFrom: (text: string) => void;
}

interface ImportLinkProps {
  id: string;
  ref: Ref<ImportLinkHandle>;
  onImported: (product: ImportedWish) => void;
}

const isHttpUrl = (text: string) => /^https?:\/\/\S+$/i.test(text) && URL.canParse(text);

/**
 * Optional links under the wish (39, 73): the server reads the page and the link joins the wish.
 * Pasting imports right away. A page we can't read (many shops block servers) still adds the link,
 * titled from its URL. Not a form of its own: it sits inside the wish form.
 */
export const ImportLink = ({ id, ref, onImported }: ImportLinkProps) => {
  const t = useTranslations('wishlist.import');
  const trpc = useTRPC();
  const errorMessage = useErrorMessage();
  const [url, setUrl] = useState('');
  const [notice, setNotice] = useState('');
  const importUrl = useMutation(trpc.import.fromUrl.mutationOptions());

  const read = async (text: string): Promise<ImportedWish | undefined> => {
    const trimmed = text.trim();
    if (!isHttpUrl(trimmed)) return void setNotice(t('blocked'));
    setNotice('');
    try {
      const product = await importUrl.mutateAsync({ url: trimmed });
      setUrl('');
      setNotice(t('added'));
      return product;
    } catch (error) {
      const data = error instanceof TRPCClientError ? error.data : undefined;
      if (data?.appCode === 'IMPORT_BLOCKED' || data?.appCode === 'INVALID_INPUT') return void setNotice(t('blocked'));
      if (data?.appCode !== 'IMPORT_FAILED') return void setNotice(errorMessage(error));
      const { url: kept = trimmed, title } = (data.details ?? {}) as { url?: string; title?: string };
      setUrl('');
      setNotice(t('added'));
      return { url: kept, ...(title && { title }) };
    }
  };

  const run = async (text: string) => {
    if (!text.trim() || importUrl.isPending) return;
    const product = await read(text);
    if (product) onImported(product);
  };

  useImperativeHandle(ref, () => ({
    importTyped: async () => {
      if (!url.trim()) return undefined;
      if (importUrl.isPending) return false;
      return (await read(url)) ?? false;
    },
    importFrom: (text) => {
      setUrl(text);
      void run(text);
    },
  }));

  const paste = (event: ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData('text').trim();
    if (!isHttpUrl(text)) return;
    event.preventDefault();
    setUrl(text);
    run(text);
  };

  return (
    <Field>
      <FieldLabel htmlFor={`${id}-link`}>{t('label')}</FieldLabel>
      <div className="flex gap-2">
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
        <Button type="button" variant="ghost" disabled={importUrl.isPending} onClick={() => run(url)}>
          <Link2 aria-hidden="true" />
          {importUrl.isPending ? t('busy') : t('submit')}
        </Button>
      </div>
      <FieldDescription id={`${id}-link-hint`}>{t('hint')}</FieldDescription>
      <p role="status" className={notice === t('added') ? 'sr-only' : 'text-sm font-semibold empty:hidden'}>
        {notice}
      </p>
    </Field>
  );
};
