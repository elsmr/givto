import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { WishKind } from '@/lib/schema/wish';
import { useTranslations } from 'next-intl';
import type { WishDraft } from './wish-draft';
import { WishImage } from './wish-image';
import { WishPriceFields } from './wish-price-fields';

interface WishMoreFieldsProps {
  id: string;
  draft: WishDraft;
  update: (changes: Partial<WishDraft>) => void;
}

export const WishMoreFields = ({ id, draft, update }: WishMoreFieldsProps) => {
  const t = useTranslations('wishlist.form');

  return (
    <div className="flex flex-col gap-4">
      <FieldSet>
        <FieldLegend variant="label">{t('kind')}</FieldLegend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {WishKind.options.map((kind) => (
            <label key={kind} className="flex items-center gap-2 font-semibold">
              <input
                type="radio"
                name={`${id}-kind`}
                value={kind}
                checked={draft.kind === kind}
                onChange={() => update({ kind })}
                className="size-5 accent-primary"
              />
              {t(`kind-${kind}`)}
            </label>
          ))}
        </div>
        {draft.kind !== 'wish' && <FieldDescription>{t(`kind-${draft.kind}-hint`)}</FieldDescription>}
      </FieldSet>
      <Field>
        <FieldLabel htmlFor={`${id}-description`}>{t('description')}</FieldLabel>
        <Textarea
          id={`${id}-description`}
          maxLength={2000}
          value={draft.description}
          onChange={(event) => update({ description: event.target.value })}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${id}-url`}>{t('url')}</FieldLabel>
        <Input
          id={`${id}-url`}
          type="url"
          inputMode="url"
          maxLength={2000}
          placeholder="https://…"
          value={draft.url}
          onChange={(event) => update({ url: event.target.value })}
        />
      </Field>
      <WishPriceFields id={id} draft={draft} update={update} />
      <Field>
        <FieldLabel htmlFor={`${id}-variant`}>{t('variant')}</FieldLabel>
        <Input
          id={`${id}-variant`}
          maxLength={200}
          value={draft.variant}
          onChange={(event) => update({ variant: event.target.value })}
        />
      </Field>
      <Field orientation="horizontal" className="w-fit">
        <Switch id={`${id}-really`} checked={draft.reallyWant} onCheckedChange={(reallyWant) => update({ reallyWant })} />
        <FieldLabel htmlFor={`${id}-really`}>{t('really-want')}</FieldLabel>
      </Field>
      {draft.imageId && (
        <div className="flex items-center gap-3">
          <WishImage imageId={draft.imageId} alt={t('image-alt', { title: draft.title })} />
          <Button type="button" variant="neutral" size="sm" onClick={() => update({ imageId: undefined })}>
            {t('remove-image')}
          </Button>
        </div>
      )}
    </div>
  );
};
