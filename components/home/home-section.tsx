import { cn } from '@/lib/utils';
import type { ComponentProps } from 'react';

/** A home page band, with the content at page width. */
export const HomeSection = ({ className, children, ...props }: ComponentProps<'section'>) => (
  <section className="py-16 sm:py-24" {...props}>
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
