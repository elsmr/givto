import { Button } from '@/components/ui/button';
import type { KeepApartPair } from '@/lib/exclusions';
import { Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { GroupMember } from './group-data';
import { MemberSelect } from './member-select';

type KeepApartPairsEditorProps = {
  pairs: KeepApartPair[];
  members: GroupMember[];
  onChange: (pairs: KeepApartPair[]) => void;
};

const samePair = ([a, b]: KeepApartPair, [c, d]: KeepApartPair) => (a === c && b === d) || (a === d && b === c);

/** Two people who shouldn't draw each other, either way (26). */
export const KeepApartPairsEditor = ({ pairs, members, onChange }: KeepApartPairsEditorProps) => {
  const t = useTranslations('group.keep-apart.pairs');
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? '?';
  const candidate: KeepApartPair = [first, second];
  const canAdd = first && second && first !== second && !pairs.some((pair) => samePair(pair, candidate));

  const add = () => {
    onChange([...pairs, candidate]);
    setFirst('');
    setSecond('');
  };

  return (
    <div className="flex flex-col gap-4">
      {pairs.length > 0 && (
        <ul className="flex flex-col gap-2">
          {pairs.map(([a, b]) => (
            <li key={`${a}-${b}`} className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{t('pair', { first: nameOf(a), second: nameOf(b) })}</span>
              <Button variant="ghost" size="icon-sm" aria-label={t('remove', { first: nameOf(a), second: nameOf(b) })} onClick={() => onChange(pairs.filter((pair) => !samePair(pair, [a, b])))}>
                <X aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <MemberSelect id="pair-first" label={t('first')} placeholder={t('first')} members={members} value={first} onChange={setFirst} />
        <span aria-hidden="true">↔</span>
        <MemberSelect id="pair-second" label={t('second')} placeholder={t('second')} members={members.filter((m) => m.id !== first)} value={second} onChange={setSecond} />
        <Button variant="neutral" size="sm" disabled={!canAdd} onClick={add}>
          <Plus aria-hidden="true" />
          {t('add')}
        </Button>
      </div>
    </div>
  );
};
