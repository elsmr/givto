import { AppShell } from '@/components/shell/app-shell';
import { ButtonsSection } from '@/components/styleguide/buttons-section';
import { ChoicesSection } from '@/components/styleguide/choices-section';
import { ColorsSection } from '@/components/styleguide/colors-section';
import { DisplaySection } from '@/components/styleguide/display-section';
import { FeedbackSection } from '@/components/styleguide/feedback-section';
import { InputsSection } from '@/components/styleguide/inputs-section';
import { NavigationSection } from '@/components/styleguide/navigation-section';
import { OverlaysSection } from '@/components/styleguide/overlays-section';
import { TypographySection } from '@/components/styleguide/typography-section';
import { loadMessages } from '@/messages/load';
import type { GetStaticProps } from 'next';
import Head from 'next/head';

// Dev aid: every UI component in its states. Sample copy is English only.
export default function StyleguidePage() {
  return (
    <AppShell app>
      <Head>
        <title>Styleguide · Givto</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div className="flex flex-col gap-16">
        <h1 className="text-5xl font-extrabold">Styleguide</h1>
        <ColorsSection />
        <TypographySection />
        <ButtonsSection />
        <InputsSection />
        <ChoicesSection />
        <DisplaySection />
        <FeedbackSection />
        <OverlaysSection />
        <NavigationSection />
      </div>
    </AppShell>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: { messages: await loadMessages(locale) },
});
