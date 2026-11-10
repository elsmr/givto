import { Card, CardContent, CardHeader, CardDivider } from '@/components/ui/card';
import { IconCardTitle } from '@/components/ui/icon-card-title';
import { Plus } from 'lucide-react';
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
    <Card className="shadow-brand">
      <CardHeader>
        <IconCardTitle icon={Plus} tone="yellow">
          {t('add-title')}
        </IconCardTitle>
      </CardHeader>
      <CardContent>
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
      <CardDivider />
      <CardContent className="@container flex flex-col gap-3">
        <ImportLink
          onImported={(draft, message) => {
            if (draft) resetForm(draft);
            setNotice(message);
          }}
        />
        <p role="status" className="text-sm font-semibold empty:hidden">
          {notice}
        </p>
      </CardContent>
    </Card>
  );
};
