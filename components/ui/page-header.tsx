import { cn } from '@/lib/utils';
import type { ReactNode, Ref } from 'react';

type PageHeaderProps = {
  title: ReactNode;
  /** Above the title: a greeting, a step, a back link. */
  eyebrow?: ReactNode;
  description?: ReactNode;
  /** Right of the title from xs, under it on phones. */
  actions?: ReactNode;
  /** Under the title: chips, meta. */
  children?: ReactNode;
  /** For flows that move focus to the heading on each step. */
  headingRef?: Ref<HTMLHeadingElement>;
  className?: string;
};

export const PageHeader = ({ title, eyebrow, description, actions, children, headingRef, className }: PageHeaderProps) => (
  <header className={cn('flex flex-col gap-2', className)}>
    {eyebrow && <div className="font-semibold text-muted">{eyebrow}</div>}
    <div className="flex flex-col gap-4 xs:flex-row xs:items-end xs:justify-between">
      <h1
        ref={headingRef}
        tabIndex={headingRef ? -1 : undefined}
        className="min-w-0 text-4xl font-extrabold break-words outline-none sm:text-5xl"
      >
        {title}
      </h1>
      {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
    </div>
    {description && <p className="max-w-prose text-muted">{description}</p>}
    {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
  </header>
);
