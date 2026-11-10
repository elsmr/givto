import { HomeClosing } from '@/components/home/home-closing';
import { HomeFaq } from '@/components/home/home-faq';
import { HomeFeatures } from '@/components/home/home-features';
import { HomeHero } from '@/components/home/home-hero';
import { HomeJsonLd } from '@/components/home/home-json-ld';
import { HowItWorks } from '@/components/home/how-it-works';
import { AppShell } from '@/components/shell/app-shell';
import { loadMessages } from '@/messages/load';
import type { GetStaticProps } from 'next';

// Static per locale (37): no session-dependent markup; the header hydrates the account state.
export default function HomePage() {
  return (
    <AppShell>
      <HomeJsonLd />
      <div className="flex flex-col gap-20 sm:gap-28">
        <HomeHero />
        <HowItWorks />
        <HomeFeatures />
        <HomeFaq />
        <HomeClosing />
      </div>
    </AppShell>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: { messages: await loadMessages(locale, ['home', 'seo']) },
});
