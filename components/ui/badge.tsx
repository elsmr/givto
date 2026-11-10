import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';

import * as React from 'react';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center justify-center border-2 border-outline px-2 py-0.5 text-xs font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none overflow-hidden',
  {
    variants: {
      variant: {
        default: 'bg-surface text-ink',
        yellow: 'bg-yellow text-ink',
        mint: 'bg-mint text-ink',
        coral: 'bg-coral text-ink',
        'primary-muted': 'bg-primary-muted text-ink',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Badge({
  className,
  variant,
  render,
  ...props
}: useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: 'span',
    render,
    props: mergeProps<'span'>(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props,
    ),
    state: {
      slot: 'badge',
      variant: variant ?? 'default',
    },
  });
}

export { Badge, badgeVariants };
