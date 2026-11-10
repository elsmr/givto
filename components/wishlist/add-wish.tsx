import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { IconCardTitle } from '@/components/ui/icon-card-title';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useErrorMessage } from './use-error-message';
import { useWishMutations } from './use-wish-mutations';
import { emptyDraft } from './wish-draft';
import { WishForm } from './wish-form';

/** "Add a wish": paste a link (or several), or type a title. */
export const AddWish = () => {
  const t = useTranslations('wishlist');
  const errorMessage = useErrorMessage();
  const { create } = useWishMutations();
  // A new key remounts an empty form after a save.
  const [formKey, setFormKey] = useState(0);

  return (
    <Card className="shadow-brand">
      <CardHeader>
        <IconCardTitle icon={Plus} tone="yellow">
          {t('add-title')}
        </IconCardTitle>
      </CardHeader>
      <CardContent>
        <WishForm
          key={formKey}
          initial={emptyDraft}
          // After a save, continue in the title field.
          autoFocus={formKey > 0}
          submitLabel={t('form.add')}
          busy={create.isPending}
          error={create.error ? errorMessage(create.error) : undefined}
          onSubmit={(input) => create.mutate(input, { onSuccess: () => setFormKey((key) => key + 1) })}
        />
      </CardContent>
    </Card>
  );
};
