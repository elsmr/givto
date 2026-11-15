import { ChevronDown } from 'lucide-react';
import { localePath } from '@/components/shell/public-pages';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { HomeSection, HomeSectionTitle } from './home-section';

const questions = ['account', 'secret', 'apart', 'late', 'far', 'cost', 'data'] as const;

// Native <details>: works before hydration and without JS.
export const HomeFaq = () => {
  const t = useTranslations('home.faq');
  const locale = useLocale();

  return (
    <HomeSection aria-labelledby="faq-title">
      <HomeSectionTitle id="faq-title" title={t('title')} />
      <div className="flex max-w-3xl flex-col gap-4">
        {questions.map((question) => (
          <details key={question} className="group bg-surface bordered shadow-md">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-lg font-semibold hover:bg-page group-open:border-b-2 group-open:border-dashed group-open:border-outline [&::-webkit-details-marker]:hidden">
              {t(`${question}.question`)}
              <ChevronDown
                aria-hidden="true"
                className="size-5 shrink-0 transition-transform group-open:rotate-180"
              />
            </summary>
            <p className="p-5">
              {t.rich(`${question}.answer`, {
                link: (chunks) => <Link href={localePath('/privacy', locale)}>{chunks}</Link>,
              })}
            </p>
          </details>
        ))}
      </div>
    </HomeSection>
  );
};
