import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { SettingsGroup, SettingsRow } from '@/components/ui/settings-group';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TriangleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/router';

/** Delete the group for everyone (27). */
export const DangerZone = ({ slug, groupName }: { slug: string; groupName: string }) => {
  const t = useTranslations('settings');
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const remove = useMutation(
    trpc.settings.deleteGroup.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.account.groups.pathFilter());
        await router.push('/app');
      },
    })
  );

  return (
    <SettingsGroup id="danger" title={t('danger.title')} icon={TriangleAlert} tone="yellow" collapsible danger>
      <SettingsRow label={t('danger.description')}>
        <Dialog>
          <DialogTrigger render={<Button variant="neutral" />}>{t('danger.button')}</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('danger.confirm-title', { group: groupName })}</DialogTitle>
              <DialogDescription>{t('danger.confirm-description')}</DialogDescription>
            </DialogHeader>
            {remove.error && (
              <p role="alert" className="text-danger">
                {t('errors.INTERNAL')}
              </p>
            )}
            <DialogFooter>
              <DialogClose render={<Button variant="neutral" />}>{t('danger.cancel')}</DialogClose>
              <Button variant="danger" disabled={remove.isPending} onClick={() => remove.mutate({ groupSlug: slug })}>
                {t('danger.confirm')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SettingsRow>
    </SettingsGroup>
  );
};
