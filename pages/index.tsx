import { HomeClosing } from '@/components/home/home-closing';
import { HomeFaq } from '@/components/home/home-faq';
import { HomeFeatures } from '@/components/home/home-features';
import { HomeGames } from '@/components/home/home-games';
import { HomeHero } from '@/components/home/home-hero';
import { HomeJsonLd } from '@/components/home/home-json-ld';
import { HomeSpotlights } from '@/components/home/home-spotlights';
import { HomeWhy } from '@/components/home/home-why';
import { HowItWorks } from '@/components/home/how-it-works';
import { AppShell } from '@/components/shell/app-shell';
import { loadMessages } from '@/messages/load';
import type { GetStaticProps } from 'next';

// Static per locale (37): no session-dependent markup; the header hydrates the account state.
export default function HomePage() {
  return (
    <AppShell wide>
      <HomeJsonLd />
      <HomeHero />
      <HomeGames />
      <HowItWorks />
      <HomeSpotlights />
      <HomeFeatures />
      <HomeWhy />
      <HomeFaq />
      <HomeClosing />
    </AppShell>
  );
}

// The Dutch twin is pages/nl/: only indexable pages have the language in the URL (81).
export const getStaticProps: GetStaticProps = async () => ({
  props: { locale: 'en', messages: await loadMessages('en', ['home', 'seo']) },
});
