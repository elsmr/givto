import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useState, type FormEvent } from 'react';
import { MAX_WISH_LINKS } from '@/lib/schema/wish';
import { ImportLink } from './import-link';
import { addImportedLink, draftToInput, emptyDraft, type WishDraft, type WishInput } from './wish-draft';
import { WishFormLinks } from './wish-form-links';
import { WishMoreFields } from './wish-more-fields';

interface WishFormProps {
  initial: WishDraft;
  submitLabel: string;
  busy: boolean;
  error?: string;
  onSubmit: (input: WishInput) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
}

const hasDetails = (draft: WishDraft) =>
  (Object.keys(emptyDraft) as (keyof WishDraft)[]).some(
    (key) => key !== 'title' && key !== 'currency' && key !== 'links' && draft[key] !== emptyDraft[key]
  );

/** Add or edit a wish (46, 73): paste links first, or just type the wish; the rest under "More details". */
export const WishForm = ({ initial, submitLabel, busy, error, onSubmit, onCancel, autoFocus }: WishFormProps) => {
  const t = useTranslations('wishlist.form');
  const id = useId();
  const [draft, setDraft] = useState(initial);
  const [showMore, setShowMore] = useState(() => hasDetails(initial));
  const update = (changes: Partial<WishDraft>) => setDraft((current) => ({ ...current, ...changes }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(draftToInput(draft));
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {draft.links.length < MAX_WISH_LINKS && (
        <ImportLink
          id={id}
          onImported={(product) => {
            setDraft((current) => addImportedLink(current, product));
            if (product.description || product.price) setShowMore(true);
          }}
        />
      )}
      <WishFormLinks links={draft.links} onChange={(links) => update({ links })} />
      <Field>
        <FieldLabel htmlFor={`${id}-title`}>{t('title')}</FieldLabel>
        <Input
          id={`${id}-title`}
          required
          maxLength={200}
          autoFocus={autoFocus}
          placeholder={t('title-placeholder')}
          value={draft.title}
          onChange={(event) => update({ title: event.target.value })}
        />
      </Field>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-fit"
        aria-expanded={showMore}
        aria-controls={`${id}-more`}
        onClick={() => setShowMore(!showMore)}
      >
        {showMore ? t('less') : t('more')}
        <ChevronDown aria-hidden="true" className={showMore ? 'rotate-180' : undefined} />
      </Button>
      <div id={`${id}-more`} hidden={!showMore}>
        {showMore && <WishMoreFields id={id} draft={draft} update={update} />}
      </div>
      {error && <Alert variant="danger">{error}</Alert>}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={busy}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="neutral" onClick={onCancel}>
            {t('cancel')}
          </Button>
        )}
      </div>
    </form>
  );
};
