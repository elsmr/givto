import { cn } from '@/lib/utils';
import type { ComponentProps } from 'react';

const fills = { surface: 'bg-surface', yellow: 'bg-yellow', mint: 'bg-mint', 'primary-muted': 'bg-primary-muted' } as const;

/** A home page band: edge to edge, optionally filled and ruled, with the content at page width. */
export const HomeSection = ({
  fill,
  className,
  children,
  ...props
}: ComponentProps<'section'> & { fill?: keyof typeof fills }) => (
  <section
    className={cn('py-16 sm:py-24', fill && ['border-y-(length:--border-width) border-outline', fills[fill]])}
    {...props}
  >
    <div className={cn('mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 sm:gap-10 sm:px-6', className)}>{children}</div>
  </section>
);

/** A section's h2 and its lead. */
export const HomeSectionTitle = ({ id, title, lead }: { id: string; title: string; lead?: string }) => (
  <div className="flex max-w-2xl flex-col gap-3">
    <h2 id={id} className="text-3xl font-extrabold text-balance sm:text-5xl">
      {title}
    </h2>
    {lead && <p className="text-lg sm:text-xl">{lead}</p>}
  </div>
);
