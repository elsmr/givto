import { Alert, AlertDescription } from '@/components/ui/alert';
import { MIN_PARTICIPANTS } from '@/lib/schema/group';
import { TRPCClientError } from '@trpc/client';
import { useFormatter, useTranslations } from 'next-intl';
import { knownAppError } from '../group/app-error-code';
import type { GroupMember } from '../group/group-data';

const knownErrors = ['TOO_FEW_PEOPLE', 'DRAW_IMPOSSIBLE', 'ALREADY_DRAWN', 'NOT_DRAWN', 'EDITION_CHANGED'] as const;

type DrawDetails = { givers?: string[]; receivers?: string[]; avoidPreviousGiftees?: boolean; min?: number };

/** Why a draw or re-draw was refused; names the stuck people (34), never the previous edition's pairs. */
export const DrawError = ({ error, members }: { error: unknown; members: GroupMember[] }) => {
  const t = useTranslations('draw.errors');
  const format = useFormatter();
  const code = knownAppError(error, knownErrors);
  const details: DrawDetails = (error instanceof TRPCClientError && error.data?.details) || {};
  const names = (ids: string[] = []) => format.list(ids.map((id) => members.find((m) => m.id === id)?.name ?? '?'));

  const message =
    code === 'DRAW_IMPOSSIBLE'
      ? details.avoidPreviousGiftees
        ? t('AVOID_PREVIOUS')
        : t('DRAW_IMPOSSIBLE', { givers: names(details.givers), receivers: names(details.receivers), count: details.receivers?.length ?? 0 })
      : code === 'TOO_FEW_PEOPLE'
        ? t('TOO_FEW_PEOPLE', { min: details.min ?? MIN_PARTICIPANTS })
        : t(code);
  return (
    <Alert variant="danger">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
};
