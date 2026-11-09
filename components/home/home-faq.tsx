import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

const questions = ['account', 'secret', 'apart', 'cost', 'data'] as const;

// Native <details>: works before hydration and without JS.
export const HomeFaq = () => {
  const t = useTranslations('home.faq');

  return (
    <section aria-labelledby="faq-title" className="flex flex-col gap-8">
      <h2 id="faq-title" className="text-3xl font-extrabold sm:text-4xl">
        {t('title')}
      </h2>
      <div className="flex flex-col gap-4">
        {questions.map((question) => (
          <details key={question} className="group bg-surface bordered shadow-md">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-lg font-semibold [&::-webkit-details-marker]:hidden">
              {t(`${question}.question`)}
              <ChevronDown
                aria-hidden="true"
                className="size-5 shrink-0 transition-transform group-open:rotate-180"
              />
            </summary>
            <p className="px-5 pb-5">
              {t.rich(`${question}.answer`, {
                link: (chunks) => <Link href="/privacy">{chunks}</Link>,
              })}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
};
