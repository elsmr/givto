import { Card, CardContent } from '@/components/ui/card';
import { IconTile } from '@/components/ui/icon-tile';
import { useTRPC } from '@/lib/client/trpc';
import { useQuery } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useErrorMessage } from './use-error-message';
import { useWishMutations } from './use-wish-mutations';
import { emptyDraft } from './wish-draft';
import { WishForm } from './wish-form';
import { isActiveGroup, WishGroupsPicker } from './wish-groups';

/**
 * "Add a wish", as a card on top of the list. In a group (`groupSlug`) the wish shows in that group only;
 * on /wishlist, in the active groups ticked, none by default.
 * With an `empty` wishlist the card is the empty state.
 */
export const AddWish = ({ groupSlug, empty = false }: { groupSlug?: string; empty?: boolean }) => {
  const t = useTranslations('wishlist');
  const errorMessage = useErrorMessage();
  const { create } = useWishMutations();
  const groups = useQuery({ ...useTRPC().account.groups.queryOptions(), enabled: !groupSlug });
  // A new key remounts an empty form after a save.
  const [formKey, setFormKey] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const hasActive = (groups.data ?? []).some(isActiveGroup);
  const groupSlugs = groupSlug ? [groupSlug] : picked;
  const toggle = (slug: string, checked: boolean) =>
    setPicked((current) => (checked ? [...current, slug] : current.filter((other) => other !== slug)));

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-4">
        {empty ? (
          <div className="flex items-center gap-4">
            <IconTile icon={Heart} tone="coral" />
            <div>
              <h2 className="text-xl font-bold">{t('empty-title')}</h2>
              <p className="text-muted">{t('empty-hint')}</p>
            </div>
          </div>
        ) : (
          <h2 className="sr-only">{t('add-title')}</h2>
        )}
        <WishForm
          key={formKey}
          compact
          initial={emptyDraft}
          // After a save, continue in the title field.
          autoFocus={formKey > 0}
          submitLabel={t('form.add')}
          busy={create.isPending}
          error={create.error ? errorMessage(create.error) : undefined}
          onSubmit={(input) => create.mutate({ ...input, groupSlugs }, { onSuccess: () => setFormKey((key) => key + 1) })}
        >
          {!groupSlug && hasActive && <WishGroupsPicker shownIn={picked} onChange={toggle} />}
        </WishForm>
      </CardContent>
    </Card>
  );
};
