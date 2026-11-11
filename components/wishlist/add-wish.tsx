import { Card, CardContent } from '@/components/ui/card';
import { useTRPC } from '@/lib/client/trpc';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { useErrorMessage } from './use-error-message';
import { useWishMutations } from './use-wish-mutations';
import { emptyDraft } from './wish-draft';
import { WishForm } from './wish-form';
import { isActiveGroup, WishGroups } from './wish-groups';

/**
 * "Add a wish", as a card on top of the list. In a group (`groupSlug`) the wish shows in that group only;
 * on /wishlist, in the groups picked: the group the person came from (?group=), else their only active group.
 */
export const AddWish = ({ groupSlug }: { groupSlug?: string }) => {
  const t = useTranslations('wishlist');
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const { create } = useWishMutations();
  const groups = useQuery({ ...useTRPC().account.groups.queryOptions(), enabled: !groupSlug });
  // A new key remounts an empty form after a save.
  const [formKey, setFormKey] = useState(0);
  // Undefined until the first tick: until then the default above, once the router and the groups are there.
  const [picked, setPicked] = useState<string[]>();
  const choices = (groups.data ?? []).filter((group) => !group.archived);
  const active = choices.filter(isActiveGroup);
  const defaultSlugs = typeof router.query.group === 'string' ? [router.query.group] : active.length === 1 ? [active[0].slug] : [];
  const groupSlugs = groupSlug ? [groupSlug] : (picked ?? defaultSlugs).filter((slug) => choices.some((group) => group.slug === slug));
  const toggle = (slug: string, checked: boolean) =>
    setPicked(checked ? [...groupSlugs, slug] : groupSlugs.filter((other) => other !== slug));

  return (
    <Card size="sm">
      <CardContent>
        <h2 className="sr-only">{t('add-title')}</h2>
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
          {!groupSlug && choices.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{t('form.show-in')}</span>
              <WishGroups shownIn={groupSlugs} onChange={toggle} />
            </div>
          )}
        </WishForm>
      </CardContent>
    </Card>
  );
};
