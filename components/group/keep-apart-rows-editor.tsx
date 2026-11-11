import { Button } from '@/components/ui/button';
import { withTooltip } from '@/components/ui/tooltip';
import { Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { GroupMember } from './group-data';
import { MemberSelect } from './member-select';

type KeepApartRowsEditorProps = {
  rows: string[][];
  members: GroupMember[];
  onChange: (rows: string[][]) => void;
};

/** Rows of people who don't draw each other (26): a couple, a family, two exes. Anyone can be in several rows. */
export const KeepApartRowsEditor = ({ rows, members, onChange }: KeepApartRowsEditorProps) => {
  const t = useTranslations('group.keep-apart.rows');
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? '?';
  const replace = (index: number, ids: string[]) => onChange(rows.map((row, i) => (i === index ? ids : row)));

  return (
    <div className="flex flex-col gap-4">
      {rows.map((row, index) => {
        const others = members.filter((m) => !row.includes(m.id));
        return (
          <div key={index} role="group" aria-label={t('label', { number: index + 1 })} className="flex flex-col gap-3 border-2 border-outline p-3">
            <div className="flex flex-wrap items-center gap-2">
              {row.map((id) => (
                <span key={id} className="inline-flex items-center gap-1 border-2 border-outline bg-primary-muted py-0.5 pl-2">
                  {nameOf(id)}
                  {withTooltip(
                    t('remove-person', { name: nameOf(id) }),
                    <Button variant="ghost" size="icon-sm" onClick={() => replace(index, row.filter((r) => r !== id))}>
                      <X aria-hidden="true" />
                    </Button>
                  )}
                </span>
              ))}
              {others.length > 0 && (
                <MemberSelect
                  id={`keep-apart-${index}-add`}
                  label={t('add-person')}
                  placeholder={t('add-person')}
                  members={others}
                  value=""
                  onChange={(id) => id && replace(index, [...row, id])}
                />
              )}
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => onChange(rows.filter((_, i) => i !== index))}>
                {t('remove')}
              </Button>
            </div>
            {row.length < 2 && <p className="text-sm text-muted">{t('needs-two')}</p>}
          </div>
        );
      })}
      <Button variant="neutral" size="sm" className="self-start" disabled={members.length < 2} onClick={() => onChange([...rows, []])}>
        <Plus aria-hidden="true" />
        {t('add')}
      </Button>
    </div>
  );
};
