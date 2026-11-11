import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Undo2 } from 'lucide-react';
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

/** The Santa marks a tip as used (or undoes it); used tips are struck through. Only the Santa sees this state. */
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

  const label = used ? t('unmark-used') : t('mark-used');
  return (
    <Button
      variant={used ? 'ghost' : 'neutral'}
      size="icon-sm"
      className="shrink-0"
      disabled={setUsed.isPending}
      aria-label={label}
      aria-describedby={textId}
      title={label}
      onClick={toggle}
    >
      {used ? <Undo2 aria-hidden="true" /> : <Check aria-hidden="true" />}
    </Button>
  );
};
