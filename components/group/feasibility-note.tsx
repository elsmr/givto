import { findStuckGivers, type Exclusion } from '@/lib/draw';
import { MIN_PARTICIPANTS } from '@/lib/schema/group';
import { TriangleAlert } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import type { GroupMember } from './group-data';

type FeasibilityNoteProps = { participantIds: string[]; exclusions: Exclusion[]; members: GroupMember[] };

/**
 * Live check with the server's own matching (34): says nothing while a draw is possible, else names who'd
 * be stuck. The status region stays mounted so a problem that appears is announced.
 */
export const FeasibilityNote = ({ participantIds, exclusions, members }: FeasibilityNoteProps) => {
  const t = useTranslations('group.keep-apart.feasibility');
  const format = useFormatter();
  const names = (ids: string[]) => format.list(ids.map((id) => members.find((m) => m.id === id)?.name ?? '?'));
  const tooFew = participantIds.length < MIN_PARTICIPANTS;
  const stuck = !tooFew && findStuckGivers(participantIds, exclusions);

  return (
    <div role="status">
      {tooFew && <p className="text-muted">{t('too-few', { min: MIN_PARTICIPANTS })}</p>}
      {stuck && (
        <p className="flex gap-2 text-danger">
          <TriangleAlert aria-hidden="true" className="size-5 shrink-0" />
          {t('stuck', { givers: names(stuck.givers), receivers: names(stuck.receivers), count: stuck.receivers.length })}
        </p>
      )}
    </div>
  );
};
