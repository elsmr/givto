import { googleError, GoogleLogo } from '@/components/auth/google-sign-in';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { authClient, throwAuthError } from '@/lib/client/auth';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFormatter, useTranslations } from 'next-intl';
import { useRouter } from 'next/router';

/** Better Auth's `?error=` codes after linking, as keys under `account.google.errors`. */
const linkErrorKey = (error: string | null) => {
  if (!error) return null;
  if (error === 'email_does_not_match') return 'email-mismatch';
  if (error === 'account_already_linked_to_different_user') return 'linked-elsewhere';
  return 'generic';
};

/** Sign in with Google too: link it (same email only) or unlink it; email sign-in always keeps working. */
export const GoogleAccount = ({ email }: { email: string }) => {
  const t = useTranslations('account.google');
  const format = useFormatter();
  const router = useRouter();
  const queryClient = useQueryClient();
  const accounts = useQuery({ queryKey: ['auth', 'accounts'], queryFn: () => throwAuthError(authClient.listAccounts()) });
  const google = accounts.data?.data?.find((account) => account.providerId === 'google');
  const link = useMutation({
    // On success the browser is on its way to Google.
    mutationFn: () => throwAuthError(authClient.linkSocial({ provider: 'google', callbackURL: '/account', errorCallbackURL: '/account' })),
    onError: () => toast.add({ title: t('errors.generic'), type: 'error' }),
  });
  const unlink = useMutation({
    mutationFn: (accountId: string) => throwAuthError(authClient.unlinkAccount({ accountId })),
    onSuccess: () => {
      toast.add({ title: t('unlinked') });
      void queryClient.invalidateQueries({ queryKey: ['auth', 'accounts'] });
    },
    onError: () => toast.add({ title: t('errors.generic'), type: 'error' }),
  });
  const linkError = linkErrorKey(googleError(router.query.error));

  if (accounts.isPending) return <Skeleton className="h-16" />;

  if (google) {
    return (
      <div className="flex flex-col gap-3 border-2 border-outline p-3 xs:flex-row xs:items-center">
        <span className="hidden xs:block">
          <GoogleLogo />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="font-semibold">{t('linked')}</span>
          <span className="text-sm text-muted">
            {t('linked-on', { date: format.dateTime(new Date(google.createdAt), { dateStyle: 'medium' }) })}
          </span>
        </div>
        <Button variant="danger" disabled={unlink.isPending} onClick={() => unlink.mutate(google.id)}>
          {t('unlink')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button className="self-start" variant="neutral" disabled={link.isPending || link.isSuccess} onClick={() => link.mutate()}>
        <GoogleLogo />
        {t('link')}
      </Button>
      {linkError && <FieldError>{t(`errors.${linkError}`, { email })}</FieldError>}
    </div>
  );
};
