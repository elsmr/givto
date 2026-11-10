import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useTRPC } from '@/lib/client/trpc';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t('danger.title')}</h2>
        </CardTitle>
        <CardDescription>{t('danger.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog>
          <DialogTrigger render={<Button variant="danger" />}>{t('danger.button')}</DialogTrigger>
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
      </CardContent>
    </Card>
  );
};
