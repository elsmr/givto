import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useErrorMessage } from './use-error-message';

interface ClaimButtonProps {
  input: { groupSlug: string; editionNumber: number; wishId: string };
  title: string;
  claim: 'mine' | 'taken' | null;
  canClaim: boolean;
}

/** Dibs! on a giftee's wish; "Taken" when another Santa (other edition or group) has it. */
export const ClaimButton = ({ input, title, claim, canClaim }: ClaimButtonProps) => {
  const t = useTranslations('wishlist.giftee');
  const errorMessage = useErrorMessage();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const options = {
    onSettled: () => queryClient.invalidateQueries({ queryKey: trpc.claim.gifteeWishlist.pathKey() }),
    onError: (error: unknown) => toast.add({ title: errorMessage(error), type: 'error' }),
  };
  const add = useMutation(trpc.claim.add.mutationOptions(options));
  const remove = useMutation(trpc.claim.remove.mutationOptions(options));
  const busy = add.isPending || remove.isPending;

  if (claim === 'taken') return <Badge>{t('taken')}</Badge>;
  const mine = claim === 'mine';
  if (!mine && !canClaim) return null;
  // One button for Dibs! and Undo keeps focus on it; the status says what happened.
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span role="status">
        {mine ? (
          <Badge variant="mint">
            <Check aria-hidden="true" />
            {t('mine')}
          </Badge>
        ) : (
          remove.isSuccess && <span className="sr-only">{t('unclaimed')}</span>
        )}
      </span>
      {canClaim && (
        <Button
          variant={mine ? 'neutral' : 'default'}
          size="sm"
          disabled={busy}
          aria-label={mine ? t('unclaim-label', { title }) : t('claim-label', { title })}
          onClick={() => (mine ? remove : add).mutate(input)}
        >
          {mine ? t('unclaim') : t('claim')}
        </Button>
      )}
    </div>
  );
};
