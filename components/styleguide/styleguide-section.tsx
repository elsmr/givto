import type { ReactNode } from 'react';

export const StyleguideSection = ({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) => (
  <section aria-labelledby={id} className="flex flex-col gap-6">
    <h2 id={id} className="text-3xl font-extrabold">
      {title}
    </h2>
    {children}
  </section>
);

export const StyleguideRow = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <div className="flex flex-col gap-3">
    <h3 className="text-sm font-semibold text-muted">{label}</h3>
    <div className="flex flex-wrap items-start gap-4">{children}</div>
  </div>
);
