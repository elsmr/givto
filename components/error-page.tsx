import { GivtoLogo } from '@/components/givto-logo';
import { AppShell } from '@/components/shell/app-shell';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/lib/client/session';
import { useTranslations } from 'next-intl';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

export const ErrorPage = ({ statusCode }: { statusCode: number }) => {
  const t = useTranslations('errors');
  const user = useCurrentUser();
  const router = useRouter();
  const isNotFound = statusCode === 404;
  const title = isNotFound ? t('not-found.title') : t('fallback.title');

  return (
    <AppShell>
      <Head>
        <title>{`${title} · Givto`}</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div className="mx-auto flex max-w-xl flex-col gap-6">
        <GivtoLogo aria-hidden="true" className="size-20 -rotate-12" />
        <div className="flex flex-col gap-2">
          <p className="font-semibold text-muted">
            {t('status', { code: statusCode })}
          </p>
          <h1 className="text-4xl font-extrabold sm:text-5xl">{title}</h1>
          <p className="text-lg text-muted">
            {isNotFound
              ? t('not-found.description')
              : t('fallback.description')}
          </p>
        </div>
        <section
          aria-labelledby="error-next-steps"
          className="flex flex-col gap-4"
        >
          <h2 id="error-next-steps" className="text-2xl font-bold">
            {t('next-steps')}
          </h2>
          {isNotFound && !user && <p>{t('invite-hint')}</p>}
          <div className="flex flex-col gap-4 xs:flex-row xs:flex-wrap">
            {!isNotFound && (
              <Button onClick={() => router.reload()}>{t('try-again')}</Button>
            )}
            {user ? (
              <Button
                variant={isNotFound ? 'default' : 'neutral'}
                nativeButton={false}
                render={<Link href="/groups" />}
              >
                {t('my-secret-santas')}
              </Button>
            ) : (
              <Button
                variant={isNotFound ? 'default' : 'neutral'}
                nativeButton={false}
                render={<Link href="/auth/sign-in" />}
              >
                {t('sign-in')}
              </Button>
            )}
            <Button
              variant="neutral"
              nativeButton={false}
              render={<Link href="/new" />}
            >
              {t('start')}
            </Button>
            <Button
              variant="neutral"
              nativeButton={false}
              render={<Link href="/" />}
            >
              {t('home')}
            </Button>
          </div>
        </section>
      </div>
    </AppShell>
  );
};
