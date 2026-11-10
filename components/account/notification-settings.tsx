import { Field, FieldLabel } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toast';
import { useTRPC } from '@/lib/client/trpc';
import type { NotificationPrefs } from '@/lib/schema/user';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

const kinds = ['reminders', 'wishlistUpdates', 'santaMessages', 'nextYear', 'joins'] as const;

export const NotificationSettings = ({ prefs }: { prefs: NotificationPrefs }) => {
  const t = useTranslations('account');
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const save = useMutation(
    trpc.account.setNotifications.mutationOptions({
      onSuccess: (saved) => {
        queryClient.setQueryData(trpc.me.get.queryKey(), (me) => me && { ...me, notifications: saved });
        toast.add({ title: t('notifications.saved') });
      },
      onError: () => toast.add({ title: t('errors.generic'), type: 'error' }),
    })
  );
  const current = save.isPending && save.variables ? save.variables : prefs;

  return (
    <div className="flex flex-col gap-4">
      {kinds.map((kind) => (
        <Field key={kind} orientation="horizontal" className="justify-between gap-4">
          <FieldLabel htmlFor={`notify-${kind}`} className="font-normal">
            {t(`notifications.${kind}`)}
          </FieldLabel>
          <Switch
            id={`notify-${kind}`}
            checked={current[kind]}
            disabled={save.isPending}
            onCheckedChange={(checked) => save.mutate({ ...current, [kind]: checked })}
          />
        </Field>
      ))}
    </div>
  );
};
