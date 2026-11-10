import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation } from '@tanstack/react-query';
import { TRPCClientError } from '@trpc/client';
import { Link2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useState, type FormEvent } from 'react';
import { useErrorMessage } from './use-error-message';
import { draftFromWish, type WishDraft } from './wish-draft';

interface ImportLinkProps {
  /** `draft` is null when the address can't be used at all. */
  onImported: (draft: WishDraft | null, notice: string) => void;
}

/** Paste a product link; the server reads the page and we prefill the form (39). */
export const ImportLink = ({ onImported }: ImportLinkProps) => {
  const t = useTranslations('wishlist.import');
  const id = useId();
  const trpc = useTRPC();
  const errorMessage = useErrorMessage();
  const [url, setUrl] = useState('');
  const importUrl = useMutation(trpc.import.fromUrl.mutationOptions());

  const submit = (event: FormEvent) => {
    event.preventDefault();
    importUrl.mutate(
      { url: url.trim() },
      {
        onSuccess: (imported) => {
          setUrl('');
          onImported(draftFromWish(imported), t('done'));
        },
        onError: (error) => {
          const data = error instanceof TRPCClientError ? error.data : undefined;
          if (data?.appCode === 'IMPORT_BLOCKED' || data?.appCode === 'INVALID_INPUT') return onImported(null, t('blocked'));
          if (data?.appCode !== 'IMPORT_FAILED') return onImported(null, errorMessage(error));
          setUrl('');
          onImported(draftFromWish({ url: data.details?.url ?? url.trim() }), t('failed'));
        },
      }
    );
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 @md:flex-row @md:items-end">
      <Field className="flex-1">
        <FieldLabel htmlFor={`${id}-url`}>{t('label')}</FieldLabel>
        <Input
          id={`${id}-url`}
          type="url"
          inputMode="url"
          required
          maxLength={2000}
          placeholder={t('placeholder')}
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
      </Field>
      <Button type="submit" variant="neutral" className="w-fit" disabled={importUrl.isPending}>
        <Link2 aria-hidden="true" />
        {importUrl.isPending ? t('busy') : t('submit')}
      </Button>
    </form>
  );
};
