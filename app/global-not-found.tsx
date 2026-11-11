import { ThemeScript } from '@/components/account/theme-script';
import { GivtoLogo } from '@/components/givto-logo';
import { FlowPage, MessageCard } from '@/components/shell/flow-page';
import { buttonVariants } from '@/components/ui/button';
import { preferredLocale } from '@/lib/server/locale';
import { headers } from 'next/headers';
import '../styles/globals.css';

/**
 * With app/ there (the gift day stream, 97), unknown URLs get the App Router's 404 instead of pages/404.tsx. ErrorPage
 * needs the Pages Router, so this is its card without the shell.
 */
export default async function GlobalNotFound() {
  const locale = preferredLocale(await headers());
  const t = (await import(`../messages/${locale}/errors.json`)).default;
  const { description } = (await import(`../messages/${locale}/shell.json`)).default;
  return (
    <html lang={locale}>
      <head>
        <ThemeScript />
        <title>{`${t['not-found'].title} · Givto`}</title>
        <meta name="description" content={description} />
      </head>
      <body>
        <main className="px-4 py-8 sm:px-6 sm:py-12">
          <FlowPage
            eyebrow={
              <span className="flex items-center gap-3">
                <GivtoLogo aria-hidden="true" className="size-12 -rotate-12" />
                {t.status.replace('{code}', '404')}
              </span>
            }
            title={t['not-found'].title}
          >
            <MessageCard
              actions={
                <a href="/" className={buttonVariants()}>
                  {t.home}
                </a>
              }
            >
              <p>{t['not-found'].description}</p>
            </MessageCard>
          </FlowPage>
        </main>
      </body>
    </html>
  );
}
