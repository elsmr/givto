import type { ReactNode } from 'react';

export const StyleguideSection = ({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  /** When to use it. */
  description?: ReactNode;
  children: ReactNode;
}) => (
  <section aria-labelledby={id} className="flex flex-col gap-6">
    <div className="flex flex-col gap-1">
      <h3 id={id} className="scroll-mt-6 text-2xl font-bold">
        {title}
      </h3>
      {description && <p className="max-w-prose text-muted">{description}</p>}
    </div>
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
    <h4 className="text-sm font-semibold text-muted">{label}</h4>
    <div className="flex flex-wrap items-start gap-4">{children}</div>
  </div>
);

/** A sample with its prop or token under it. */
export const Captioned = ({ caption, children }: { caption: string; children: ReactNode }) => (
  <div className="flex flex-col gap-2">
    {children}
    <code className="text-xs text-muted">{caption}</code>
  </div>
);
