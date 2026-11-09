'use client';

import { Switch as SwitchPrimitive } from '@base-ui/react/switch';

import * as React from 'react';

import { cn } from '@/lib/utils';

function Switch({
  className,
  size = 'default',
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: 'sm' | 'default';
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        'peer inline-flex shrink-0 cursor-pointer items-center border-2 border-ink bg-surface transition-colors data-disabled:cursor-not-allowed data-disabled:border-dashed data-disabled:bg-page data-checked:bg-primary data-unchecked:bg-surface',
        size === 'default' && 'h-6 w-12',
        size === 'sm' && 'h-5 w-9',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'pointer-events-none block bg-white border-2 border-ink transition-transform data-unchecked:translate-x-1',
          size === 'default' && 'h-4 w-4 data-checked:translate-x-6',
          size === 'sm' && 'h-3 w-3 data-checked:translate-x-4',
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
