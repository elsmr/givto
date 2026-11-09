import type { ReactNode } from 'react';

export const PrivacySection = ({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) => (
  <section aria-labelledby={id} className="flex flex-col gap-4">
    <h2 id={id} className="text-2xl font-extrabold sm:text-3xl">
      {title}
    </h2>
    {children}
  </section>
);
