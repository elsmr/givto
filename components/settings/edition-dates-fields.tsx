import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { addDays } from '@/lib/local-date';
import { useTranslations } from 'next-intl';
import type { EditionDraft } from './edition-draft';

type EditionDatesFieldsProps = {
  draft: EditionDraft;
  today: string;
  /** The draw date only changes before the draw. */
  canSchedule: boolean;
  onChange: (patch: Partial<EditionDraft>) => void;
};

type DateField = 'drawOn' | 'wishlistBy' | 'postBy';

/** Draw date, wishlists-ready-by and post-by (28). The min/max hints mirror the server's checks. */
export const EditionDatesFields = ({ draft, today, canSchedule, onChange }: EditionDatesFieldsProps) => {
  const t = useTranslations('settings.edition');
  const giftDay = draft.giftDate || undefined;
  const dateField = (field: DateField, label: string, help: string, max?: string) => (
    <Field>
      <FieldLabel htmlFor={`edition-${field}`}>{label}</FieldLabel>
      <Input
        id={`edition-${field}`}
        type="date"
        min={today}
        max={max}
        value={draft[field]}
        onChange={(event) => onChange({ [field]: event.target.value })}
      />
      <FieldDescription>{help}</FieldDescription>
    </Field>
  );

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {canSchedule && dateField('drawOn', t('draw-on'), t('draw-on-help'), giftDay && addDays(giftDay, -1))}
      {dateField('wishlistBy', t('wishlist-by'), t('wishlist-by-help'), giftDay)}
      {draft.exchangeMode !== 'inPerson' && dateField('postBy', t('post-by'), t('post-by-help'), giftDay)}
    </div>
  );
};
