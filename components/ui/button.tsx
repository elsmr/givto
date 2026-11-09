import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';

import * as React from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap text-base font-semibold gap-2 no-underline [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0 disabled:pointer-events-none disabled:border-dashed disabled:bg-page disabled:text-muted disabled:shadow-none data-disabled:pointer-events-none data-disabled:border-dashed data-disabled:bg-page data-disabled:text-muted data-disabled:shadow-none',
  {
    variants: {
      variant: {
        default: 'text-white bg-primary bordered shadow-md pressable',
        neutral: 'bg-surface text-ink bordered shadow-md pressable',
        danger: 'bg-coral text-ink bordered shadow-md pressable',
        ghost:
          'bg-transparent text-ink border-2 border-transparent hover:bg-primary-muted',
      },
      size: {
        default: 'h-11 px-4',
        sm: 'h-9 px-3 text-sm [&_svg]:size-4',
        lg: 'h-13 px-6 text-lg',
        icon: 'size-11',
        'icon-sm': 'size-9 [&_svg]:size-4',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof ButtonPrimitive> &
  VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
