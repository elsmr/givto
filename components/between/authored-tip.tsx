import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { useTRPC, type RouterOutputs } from '@/lib/client/trpc';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { EditionInput } from './edition-input';
import { TipForm } from './tip-form';
import { useBetweenError } from './use-between-error';

type AuthoredTipView = RouterOutputs['tip']['authored']['tips'][number];

/** One of your own tips: who it's about, the text, edit and delete. Never shows whether it was used. */
export const AuthoredTip = ({ input, tip, canEdit }: { input: EditionInput; tip: AuthoredTipView; canEdit: boolean }) => {
  const t = useTranslations('between.tips');
  const errorMessage = useBetweenError();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const onSettled = () => queryClient.invalidateQueries({ queryKey: trpc.tip.pathKey() });
  const update = useMutation(trpc.tip.update.mutationOptions({ onSuccess: () => setEditing(false), onSettled }));
  const remove = useMutation(
    trpc.tip.delete.mutationOptions({
      onSuccess: () => toast.add({ title: t('deleted'), type: 'success' }),
      onError: (error) => toast.add({ title: errorMessage(error), type: 'error' }),
      onSettled,
    })
  );

  return (
    <li className="flex flex-col gap-2 border-b-2 border-ink pb-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold">{t('about-name', { name: tip.aboutName })}</span>
        {tip.anonymous && <Badge>{t('anonymous-badge')}</Badge>}
      </div>
      {editing ? (
        <TipForm
          initial={tip}
          submitLabel={t('save')}
          busy={update.isPending}
          error={update.error ? errorMessage(update.error) : undefined}
          onSubmit={({ text, anonymous }) => update.mutate({ ...input, tipId: tip.id, text, anonymous })}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          <p className="break-words whitespace-pre-line">{tip.text}</p>
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <Button variant="neutral" size="sm" aria-label={t('edit-label', { name: tip.aboutName })} onClick={() => setEditing(true)}>
                <Pencil aria-hidden="true" />
                {t('edit')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={remove.isPending}
                aria-label={t('delete-label', { name: tip.aboutName })}
                onClick={() => remove.mutate({ ...input, tipId: tip.id })}
              >
                <Trash2 aria-hidden="true" />
                {t('delete')}
              </Button>
            </div>
          )}
        </>
      )}
    </li>
  );
};
