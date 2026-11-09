import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

const steps = [
  'create',
  'share',
  'join',
  'draw',
  'wishlists',
  'gift-day',
] as const;
const numberFills = ['bg-yellow', 'bg-mint', 'bg-primary-muted', 'bg-coral'];

export const HowItWorks = () => {
  const t = useTranslations('home.steps');

  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-title"
      className="flex scroll-mt-8 flex-col gap-8"
    >
      <h2 id="how-it-works-title" className="text-3xl font-extrabold sm:text-4xl">
        {t('title')}
      </h2>
      <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-4 bg-surface p-5 bordered shadow-md">
            <span
              aria-hidden="true"
              className={cn(
                'flex size-10 shrink-0 items-center justify-center font-heading text-xl font-extrabold bordered',
                numberFills[index % numberFills.length],
              )}
            >
              {index + 1}
            </span>
            <div className="flex flex-col gap-1">
              <h3 className="text-xl font-bold">{t(`${step}.title`)}</h3>
              <p>{t(`${step}.description`)}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
};
