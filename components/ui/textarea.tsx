import * as React from 'react';

import { cn } from '@/lib/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex min-h-24 w-full border-2 border-control bg-surface px-3 py-2 text-base text-ink placeholder:text-muted disabled:cursor-not-allowed disabled:border-dashed disabled:bg-page disabled:text-muted aria-invalid:border-danger focus-visible:border-focus focus-visible:shadow-[inset_0_0_0_1px_var(--color-focus)] focus-visible:outline-none',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
