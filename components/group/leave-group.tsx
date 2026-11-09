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
import { useTRPC } from '@/lib/client/trpc';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/router';

/** Members can leave, also after the draw (48: the draw is patched); wishes stay theirs. */
export const LeaveGroup = ({ slug, groupName }: { slug: string; groupName: string }) => {
  const t = useTranslations('group.leave');
  const trpc = useTRPC();
  const router = useRouter();
  const leave = useMutation(trpc.membership.leave.mutationOptions({ onSuccess: () => void router.push('/groups') }));

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="ghost" className="self-start" />}>{t('button')}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title', { group: groupName })}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        {leave.error && (
          <p role="alert" className="text-danger">
            {t('errors.INTERNAL')}
          </p>
        )}
        <DialogFooter>
          <DialogClose render={<Button variant="neutral" />}>{t('cancel')}</DialogClose>
          <Button variant="danger" disabled={leave.isPending} onClick={() => leave.mutate({ groupSlug: slug })}>
            {t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
