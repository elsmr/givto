import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useState, type ClipboardEvent, type FormEvent, type ReactNode } from 'react';
import { MAX_WISH_LINKS } from '@/lib/schema/wish';
import { findUrls, removeUrls } from './text-urls';
import { useLinkImport } from './use-link-import';
import { addImportedLink, draftToInput, emptyDraft, type ImportedWish, type WishDraft, type WishInput } from './wish-draft';
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
  /** The add card: labels for screen readers only, and no "More details". */
  compact?: boolean;
  /** Beside the buttons, e.g. the groups that see the wish. */
  children?: ReactNode;
}

const hasDetails = (draft: WishDraft) =>
  (Object.keys(emptyDraft) as (keyof WishDraft)[]).some(
    (key) => key !== 'title' && key !== 'description' && key !== 'currency' && key !== 'links' && draft[key] !== emptyDraft[key]
  );

/**
 * Add or edit a wish (46, 73): the wish and notes; a link pasted or typed into either becomes one of the
 * wish's links, read from the page. Editing has the rest under "More details".
 */
export const WishForm = ({ initial, submitLabel, busy, error, onSubmit, onCancel, autoFocus, compact, children }: WishFormProps) => {
  const t = useTranslations('wishlist');
  const id = useId();
  const [draft, setDraft] = useState(initial);
  const [showMore, setShowMore] = useState(() => hasDetails(initial));
  const links = useLinkImport();
  const update = (changes: Partial<WishDraft>) => setDraft((current) => ({ ...current, ...changes }));
  const addLink = (product: ImportedWish) => {
    setDraft((current) => addImportedLink(current, product));
    if (product.price) setShowMore(true);
  };

  // A link that can't be read goes in as text after all.
  const pasteLink = (field: 'title' | 'description') => (event: ClipboardEvent) => {
    const text = event.clipboardData.getData('text').trim();
    if (findUrls(text)[0] !== text || draft.links.length >= MAX_WISH_LINKS) return;
    event.preventDefault();
    void links.read(text).then((product) =>
      product ? addLink(product) : setDraft((current) => ({ ...current, [field]: `${current[field]} ${text}`.trim() }))
    );
  };

  // Links still in the text join the wish's links; one that can't be read stays in the text.
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const urls = [...new Set([...findUrls(draft.title), ...findUrls(draft.description)])];
    const linked = urls.filter((url) => draft.links.some((link) => link.url === url));
    const toRead = urls.filter((url) => !linked.includes(url)).slice(0, MAX_WISH_LINKS - draft.links.length);
    const results = await Promise.all(toRead.map(async (url) => ({ url, product: await links.read(url) })));
    const imported = results.flatMap(({ url, product }) => (product ? [{ url, product }] : []));
    const importedUrls = [...linked, ...imported.map(({ url }) => url)];
    const withLinks = imported.reduce((current, { product }) => addImportedLink(current, product), {
      ...draft,
      title: removeUrls(draft.title, importedUrls),
      description: removeUrls(draft.description, importedUrls),
    });
    // A wish that was only a link no page title could replace keeps the link as its title.
    const next = withLinks.title ? withLinks : { ...withLinks, title: draft.title };
    setDraft(next);
    onSubmit(draftToInput(next));
  };

  return (
    <form onSubmit={submit} className={cn('flex flex-col', compact ? 'gap-3' : 'gap-4')}>
      <Field>
        <FieldLabel htmlFor={`${id}-title`} className={cn(compact && 'sr-only')}>
          {t('form.title')}
        </FieldLabel>
        <Input
          id={`${id}-title`}
          required
          maxLength={200}
          autoFocus={autoFocus}
          className="h-12 text-lg font-semibold"
          placeholder={t('form.title-placeholder')}
          value={draft.title}
          onChange={(event) => update({ title: event.target.value })}
          onPaste={pasteLink('title')}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${id}-description`} className={cn(compact && 'sr-only')}>
          {t('form.description')}
        </FieldLabel>
        <Textarea
          id={`${id}-description`}
          maxLength={2000}
          className={cn(compact && 'min-h-16')}
          placeholder={t('form.description-placeholder')}
          value={draft.description}
          onChange={(event) => update({ description: event.target.value })}
          onPaste={pasteLink('description')}
        />
      </Field>
      <WishFormLinks links={draft.links} onChange={(links) => update({ links })} />
      <p role="status" className={links.added && !links.reading ? 'sr-only' : 'text-sm font-semibold empty:hidden'}>
        {links.reading ? t('import.busy') : links.notice}
      </p>
      {!compact && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-fit"
            aria-expanded={showMore}
            aria-controls={`${id}-more`}
            onClick={() => setShowMore(!showMore)}
          >
            {showMore ? t('form.less') : t('form.more')}
            <ChevronDown aria-hidden="true" className={showMore ? 'rotate-180' : undefined} />
          </Button>
          <div id={`${id}-more`} hidden={!showMore}>
            {showMore && <WishMoreFields id={id} draft={draft} update={update} />}
          </div>
        </>
      )}
      {error && <Alert variant="danger">{error}</Alert>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {children}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={busy || links.reading}>
            {submitLabel}
          </Button>
          {onCancel && (
            <Button type="button" variant="neutral" onClick={onCancel}>
              {t('form.cancel')}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
};
