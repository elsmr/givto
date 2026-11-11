import { AppHead } from '@/components/shell/app-head';
import { MotionProvider } from '@/components/shell/motion-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Providers } from '@/lib/client/providers';
import { NextIntlClientProvider, type Messages } from 'next-intl';
import type { AppProps } from 'next/app';
import dynamic from 'next/dynamic';
import '../styles/globals.css';

// Toasts only follow user actions, so the toast UI loads after the page.
const Toaster = dynamic(
  () => import('@/components/ui/toast').then((module) => module.Toaster),
  { ssr: false },
);

// Formatting default; dates tied to a group pass the group's time zone explicitly.
const timeZone = 'Europe/Brussels';

export default function GivtoApp({
  Component,
  pageProps,
  router,
}: AppProps<{ messages?: Partial<Messages> }>) {
  return (
    <NextIntlClientProvider
      locale={router.locale ?? 'en'}
      messages={pageProps.messages ?? {}}
      timeZone={timeZone}
    >
      <AppHead />
      <MotionProvider>
        <Providers>
          <TooltipProvider>
            <Component {...pageProps} />
          </TooltipProvider>
        </Providers>
      </MotionProvider>
      <Toaster />
    </NextIntlClientProvider>
  );
}
