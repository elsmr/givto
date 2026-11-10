import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { EditionInput } from './edition-input';
import { useBetweenError } from './use-between-error';

interface TipUsedButtonProps {
  input: EditionInput;
  tipId: string;
  /** Id of the tip's text, so screen readers hear which tip the button is for. */
  textId: string;
  used: boolean;
}

/** The Santa marks a tip as used (or undoes it). Only the Santa sees this state. */
export const TipUsedButton = ({ input, tipId, textId, used }: TipUsedButtonProps) => {
  const t = useTranslations('between.santa');
  const errorMessage = useBetweenError();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const setUsed = useMutation(
    trpc.tip.setUsed.mutationOptions({
      onError: (error) => toast.add({ title: errorMessage(error), type: 'error' }),
      onSettled: () => queryClient.invalidateQueries({ queryKey: trpc.tip.forGiftee.pathKey() }),
    })
  );
  const toggle = () => setUsed.mutate({ ...input, tipId, used: !used });

  if (used) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="mint">
          <Check aria-hidden="true" />
          {t('used')}
        </Badge>
        <Button variant="ghost" size="sm" disabled={setUsed.isPending} aria-describedby={textId} onClick={toggle}>
          {t('unmark-used')}
        </Button>
      </div>
    );
  }
  return (
    <Button variant="neutral" size="sm" disabled={setUsed.isPending} aria-describedby={textId} onClick={toggle}>
      {t('mark-used')}
    </Button>
  );
};
