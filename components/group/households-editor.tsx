import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { GroupMember } from './group-data';
import { MemberSelect } from './member-select';

type HouseholdsEditorProps = {
  households: string[][];
  members: GroupMember[];
  onChange: (households: string[][]) => void;
};

/** Nobody draws someone from their own household (26). Each person is in at most one. */
export const HouseholdsEditor = ({ households, members, onChange }: HouseholdsEditorProps) => {
  const t = useTranslations('group.keep-apart.households');
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? '?';
  const unassigned = members.filter((m) => !households.flat().includes(m.id));
  const replace = (index: number, ids: string[]) =>
    onChange(households.map((household, i) => (i === index ? ids : household)));

  return (
    <div className="flex flex-col gap-4">
      {households.map((household, index) => (
        <div key={index} className="flex flex-col gap-3 border-2 border-outline p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{t('label', { number: index + 1 })}</span>
            {household.map((id) => (
              <span key={id} className="inline-flex items-center gap-1 border-2 border-outline bg-primary-muted py-0.5 pl-2">
                {nameOf(id)}
                <Button variant="ghost" size="icon-sm" aria-label={t('remove-person', { name: nameOf(id) })} onClick={() => replace(index, household.filter((h) => h !== id))}>
                  <X aria-hidden="true" />
                </Button>
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {unassigned.length > 0 && (
              <MemberSelect
                id={`household-${index}-add`}
                label={t('add-person')}
                placeholder={t('add-person')}
                members={unassigned}
                value=""
                onChange={(id) => id && replace(index, [...household, id])}
              />
            )}
            <Button variant="ghost" size="sm" onClick={() => onChange(households.filter((_, i) => i !== index))}>
              {t('remove')}
            </Button>
          </div>
          {household.length < 2 && <p className="text-sm text-muted">{t('needs-two')}</p>}
        </div>
      ))}
      <Button variant="neutral" size="sm" className="self-start" disabled={unassigned.length < 2} onClick={() => onChange([...households, []])}>
        <Plus aria-hidden="true" />
        {t('add')}
      </Button>
    </div>
  );
};
