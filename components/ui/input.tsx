import * as React from 'react';

import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex h-11 w-full min-w-0 border-2 border-ink bg-surface px-3 py-2 text-base text-ink file:border-0 file:bg-transparent file:text-sm file:font-bold placeholder:text-muted disabled:cursor-not-allowed disabled:border-dashed disabled:bg-page disabled:text-muted aria-invalid:border-danger',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
