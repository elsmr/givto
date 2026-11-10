import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { MAX_GIFT_LINES } from '@/lib/schema/gift';
import { Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';

type GiftLinesProps = { lines: string[]; onChange: (lines: string[]) => void };

/** "Something else": short lines for gifts that aren't on the wishlist ("a scarf"). */
export const GiftLines = ({ lines, onChange }: GiftLinesProps) => {
  const t = useTranslations('wishlist.got-gift');
  const id = useId();
  const [text, setText] = useState('');
  const line = text.trim();
  const add = () => {
    if (!line || lines.length >= MAX_GIFT_LINES) return;
    onChange([...lines, line]);
    setText('');
  };

  return (
    <div className="flex flex-col gap-2">
      <Field>
        <FieldLabel htmlFor={id}>{t('other')}</FieldLabel>
        <div className="flex gap-2">
          <Input
            id={id}
            value={text}
            maxLength={100}
            placeholder={t('other-placeholder')}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              add();
            }}
          />
          <Button type="button" variant="neutral" disabled={!line || lines.length >= MAX_GIFT_LINES} onClick={add}>
            <Plus aria-hidden="true" />
            {t('add-line')}
          </Button>
        </div>
      </Field>
      {lines.length > 0 && (
        <ul className="flex flex-col gap-1">
          {lines.map((item, index) => (
            <li key={`${index}-${item}`} className="flex items-center justify-between gap-2 border-b-2 border-dashed border-outline py-1">
              <span className="min-w-0 break-words">{item}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t('remove-line', { line: item })}
                onClick={() => onChange(lines.filter((_, i) => i !== index))}
              >
                <X aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
