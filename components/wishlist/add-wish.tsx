import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ImportLink } from './import-link';
import { useErrorMessage } from './use-error-message';
import { useWishMutations } from './use-wish-mutations';
import { emptyDraft, type WishDraft } from './wish-draft';
import { WishForm } from './wish-form';

/** "Add a wish": type a title, or paste a link to prefill the form. */
export const AddWish = () => {
  const t = useTranslations('wishlist');
  const errorMessage = useErrorMessage();
  const { create } = useWishMutations();
  // A new key remounts the form with fresh initial values (after an import or a save).
  const [form, setForm] = useState<{ key: number; initial: WishDraft }>({ key: 0, initial: emptyDraft });
  const [notice, setNotice] = useState('');
  const resetForm = (initial: WishDraft) => setForm(({ key }) => ({ key: key + 1, initial }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t('add-title')}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <ImportLink
          onImported={(draft, message) => {
            if (draft) resetForm(draft);
            setNotice(message);
          }}
        />
        <p role="status" className="text-sm font-semibold empty:hidden">
          {notice}
        </p>
        <WishForm
          key={form.key}
          initial={form.initial}
          // After an import or a save, continue in the title field.
          autoFocus={form.key > 0}
          submitLabel={t('form.add')}
          busy={create.isPending}
          error={create.error ? errorMessage(create.error) : undefined}
          onSubmit={(input) =>
            create.mutate(input, {
              onSuccess: () => {
                resetForm(emptyDraft);
                setNotice('');
              },
            })
          }
        />
      </CardContent>
    </Card>
  );
};
