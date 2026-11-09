import { findStuckGivers, type Exclusion } from '@/lib/draw';
import { MIN_PARTICIPANTS } from '@/lib/schema/group';
import { CircleCheck, TriangleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { GroupMember } from './group-data';

type FeasibilityNoteProps = { participantIds: string[]; exclusions: Exclusion[]; members: GroupMember[] };

/** Live check with the server's own matching (34): names the people who'd be stuck. */
export const FeasibilityNote = ({ participantIds, exclusions, members }: FeasibilityNoteProps) => {
  const t = useTranslations('group.keep-apart.feasibility');
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? '?';

  if (participantIds.length < MIN_PARTICIPANTS) {
    return <p className="text-muted">{t('too-few', { min: MIN_PARTICIPANTS })}</p>;
  }
  const stuck = findStuckGivers(participantIds, exclusions);
  return (
    <p role="status" className={stuck ? 'flex gap-2 text-danger' : 'flex gap-2'}>
      {stuck ? <TriangleAlert aria-hidden="true" className="size-5 shrink-0" /> : <CircleCheck aria-hidden="true" className="size-5 shrink-0" />}
      {stuck
        ? t('stuck', {
            givers: stuck.givers.map(nameOf).join(', '),
            receivers: stuck.receivers.map(nameOf).join(', ') || '–',
            count: stuck.receivers.length,
          })
        : t('possible')}
    </p>
  );
};
