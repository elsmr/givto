import { Field, FieldDescription, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SegmentedRadio } from '@/components/ui/segmented-radio';
import { Switch } from '@/components/ui/switch';
import { WishKind } from '@/lib/schema/wish';
import { useTranslations } from 'next-intl';
import type { WishDraft } from './wish-draft';
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
        <SegmentedRadio
          name={`${id}-kind`}
          value={draft.kind}
          onValueChange={(kind) => update({ kind })}
          options={WishKind.options.map((kind) => ({ value: kind, label: t(`kind-${kind}`) }))}
        />
        {draft.kind !== 'wish' && <FieldDescription>{t(`kind-${draft.kind}-hint`)}</FieldDescription>}
      </FieldSet>
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
    </div>
  );
};
