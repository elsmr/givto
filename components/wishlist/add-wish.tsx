import { Alert } from '@/components/ui/alert';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { IconCardTitle } from '@/components/ui/icon-card-title';
import { useTRPC } from '@/lib/client/trpc';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/router';
import { useId, useState } from 'react';
import { useErrorMessage } from './use-error-message';
import { useWishMutations } from './use-wish-mutations';
import { emptyDraft } from './wish-draft';
import { WishForm } from './wish-form';

/** "Add a wish": paste a link (or several), or type a title, and pick the groups that see it (none by default). */
export const AddWish = () => {
  const t = useTranslations('wishlist');
  const id = useId();
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const { create } = useWishMutations();
  const groups = useQuery(useTRPC().account.groups.queryOptions());
  // A new key remounts an empty form after a save.
  const [formKey, setFormKey] = useState(0);
  // Undefined until the first tick: until then the group the person came from (?group=) is ticked, once the router has it.
  const [picked, setPicked] = useState<string[]>();
  const choices = (groups.data ?? []).filter((group) => !group.archived);
  const fromGroup = typeof router.query.group === 'string' ? [router.query.group] : [];
  const groupSlugs = (picked ?? fromGroup).filter((slug) => choices.some((group) => group.slug === slug));
  const activeTicked = choices.filter((group) => groupSlugs.includes(group.slug) && group.edition?.status !== 'done');
  const toggle = (slug: string, checked: boolean) =>
    setPicked(checked ? [...groupSlugs, slug] : groupSlugs.filter((other) => other !== slug));

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
          onSubmit={(input) => create.mutate({ ...input, groupSlugs }, { onSuccess: () => setFormKey((key) => key + 1) })}
        >
          {choices.length > 0 && (
            <FieldSet className="gap-3">
              <FieldLegend variant="label">{t('form.show-in')}</FieldLegend>
              <FieldDescription>{t('form.show-in-hint')}</FieldDescription>
              <ul className="flex flex-col gap-3">
                {choices.map((group) => (
                  <li key={group.slug}>
                    <Field orientation="horizontal">
                      <Checkbox
                        id={`${id}-${group.slug}`}
                        checked={groupSlugs.includes(group.slug)}
                        onCheckedChange={(checked) => toggle(group.slug, checked)}
                      />
                      <FieldLabel htmlFor={`${id}-${group.slug}`} className="font-normal break-words">
                        {group.name}
                      </FieldLabel>
                    </Field>
                  </li>
                ))}
              </ul>
              {activeTicked.length > 1 && <Alert>{t('form.show-in-duplicate')}</Alert>}
            </FieldSet>
          )}
        </WishForm>
      </CardContent>
    </Card>
  );
};
